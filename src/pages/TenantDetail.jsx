import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, RefreshCw, Check, Copy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { callAdminApi } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'

const statusVariant = { ACTIVE: 'success', INACTIVE: 'default', SUSPENDED: 'danger', REVOKED: 'danger', GENERATED: 'info', EXPIRED: 'warning' }

async function fetchTenant(id) {
  const [{ data: tenant }, { data: licenses }] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', id).single(),
    supabase.from('licenses').select('*').eq('tenant_id', id).order('created_at', { ascending: false }),
  ])
  return { tenant, licenses: licenses ?? [] }
}

export default function TenantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showCreateLic, setShowCreateLic] = useState(false)
  const defaultExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const [licForm, setLicForm] = useState({ license_type: 'STANDARD', max_mailboxes: 10, max_users: 5, expires_at: defaultExpiry })
  const [licError, setLicError] = useState('')
  const [copiedToken, setCopiedToken] = useState(null)

  const { data, isLoading } = useQuery({ queryKey: ['tenant', id], queryFn: () => fetchTenant(id) })

  const updateStatusMutation = useMutation({
    mutationFn: (status) => callAdminApi('admin-update-tenant-status', { tenant_id: id, status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant', id] }),
  })

  const createLicMutation = useMutation({
    mutationFn: (body) => callAdminApi('admin-create-license', { tenant_id: id, ...body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant', id] })
      setShowCreateLic(false)
      setLicError('')
      setLicForm({ license_type: 'STANDARD', max_mailboxes: 10, max_users: 5, expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] })
    },
    onError: (e) => setLicError(e.message),
  })

  const revokeLicMutation = useMutation({
    mutationFn: (licenseId) => callAdminApi('admin-revoke-license', { license_id: licenseId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant', id] }),
  })

  function copyToken(token) {
    navigator.clipboard.writeText(token)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  if (isLoading) return <div className="p-8 text-slate-400 text-sm">Loading...</div>
  const { tenant, licenses } = data ?? {}
  if (!tenant) return <div className="p-8 text-sm text-red-600">Tenant not found</div>

  const statusOptions = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'SUSPENDED', label: 'Suspended' },
  ]

  return (
    <div className="p-8 max-w-4xl">
      <button onClick={() => navigate('/tenants')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft className="h-4 w-4" /> Tenants
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{tenant.company_name}</h1>
          <p className="text-sm font-mono text-slate-500 mt-0.5">{tenant.company_code}</p>
        </div>
        <Badge variant={statusVariant[tenant.status] ?? 'default'}>{tenant.status}</Badge>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 space-y-3 text-sm">
        <Detail label="Created" value={new Date(tenant.created_at).toLocaleString()} />
        {tenant.project_url && <Detail label="Project URL" value={tenant.project_url} mono />}
        {tenant.activated_at && <Detail label="Activated" value={new Date(tenant.activated_at).toLocaleString()} />}
        {tenant.deactivated_at && <Detail label="Deactivated" value={new Date(tenant.deactivated_at).toLocaleString()} />}
      </div>

      {/* Status change */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Update Status</h2>
        <div className="flex items-center gap-3">
          <Select
            options={statusOptions}
            defaultValue={tenant.status}
            onChange={e => updateStatusMutation.mutate(e.target.value)}
            disabled={updateStatusMutation.isPending}
            className="w-44"
          />
          {updateStatusMutation.isPending && <span className="text-xs text-slate-400">Saving...</span>}
        </div>
      </div>

      {/* Licenses */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">Licenses</h2>
          <button
            onClick={() => setShowCreateLic(true)}
            className="flex items-center gap-1.5 text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700"
          >
            <Plus className="h-3.5 w-3.5" /> Generate
          </button>
        </div>
        {licenses.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">No licenses yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Mailboxes</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Expires</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Token</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {licenses.map(lic => (
                <tr key={lic.id}>
                  <td className="px-4 py-3"><Badge variant={statusVariant[lic.status] ?? 'default'}>{lic.status}</Badge></td>
                  <td className="px-4 py-3 text-slate-600">{lic.max_mailboxes}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(lic.expires_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => copyToken(lic.license_key)}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                    >
                      {copiedToken === lic.license_key ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedToken === lic.license_key ? 'Copied' : 'Copy'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {lic.status === 'ACTIVE' && (
                      <button
                        onClick={() => revokeLicMutation.mutate(lic.id)}
                        disabled={revokeLicMutation.isPending}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showCreateLic} onClose={() => setShowCreateLic(false)} title="Generate License">
        <form onSubmit={e => { e.preventDefault(); setLicError(''); createLicMutation.mutate(licForm) }} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">License Type</label>
            <select
              value={licForm.license_type}
              onChange={e => setLicForm(f => ({ ...f, license_type: e.target.value }))}
              className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="STANDARD">Standard</option>
              <option value="PROFESSIONAL">Professional</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Max Mailboxes</label>
            <input
              type="number" min={1} required
              value={licForm.max_mailboxes}
              onChange={e => setLicForm(f => ({ ...f, max_mailboxes: Number(e.target.value) }))}
              className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Max Users</label>
            <input
              type="number" min={1} required
              value={licForm.max_users}
              onChange={e => setLicForm(f => ({ ...f, max_users: Number(e.target.value) }))}
              className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Expiry Date</label>
            <input
              type="date" required
              min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
              value={licForm.expires_at}
              onChange={e => setLicForm(f => ({ ...f, expires_at: e.target.value }))}
              className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          {licError && <p className="text-sm text-red-600">{licError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreateLic(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={createLicMutation.isPending} className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
              {createLicMutation.isPending ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function Detail({ label, value, mono }) {
  return (
    <div className="flex gap-4">
      <span className="w-32 text-slate-500 shrink-0">{label}</span>
      <span className={`text-slate-900 break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}
