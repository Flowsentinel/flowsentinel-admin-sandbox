import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Check, Copy, ExternalLink, FileText, Pencil, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { callAdminApi } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { LicenseDocument } from '@/components/LicenseDocument'

const statusVariant = {
  ACTIVE: 'success', INACTIVE: 'default', SUSPENDED: 'danger',
  REVOKED: 'danger', GENERATED: 'info', ACTIVATED: 'success', EXPIRED: 'warning',
}

async function fetchTenant(id) {
  const [{ data: tenant }, { data: licenses }] = await Promise.all([
    supabase
      .from('tenants')
      .select('*, partners(id, company_name)')
      .eq('id', id)
      .single(),
    supabase
      .from('licenses')
      .select('*')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false }),
  ])
  return { tenant, licenses: licenses ?? [] }
}

async function fetchActivePartners() {
  const { data } = await supabase
    .from('partners')
    .select('id, company_name')
    .eq('is_active', true)
    .order('company_name')
  return data ?? []
}

export default function TenantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [showCreateLic, setShowCreateLic] = useState(false)
  const defaultExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const [licForm, setLicForm] = useState({ license_type: 'STANDARD', max_mailboxes: 10, max_users: 5, expires_at: defaultExpiry })
  const [licError, setLicError]             = useState('')
  const [copiedToken, setCopiedToken]       = useState(null)
  const [confirmRevoke, setConfirmRevoke]   = useState(null)
  const [viewLicDoc, setViewLicDoc]         = useState(null)
  const [showEdit, setShowEdit]             = useState(false)
  const [editForm, setEditForm]             = useState({})
  const [editError, setEditError]           = useState('')
  const [renewTarget, setRenewTarget]       = useState(null)
  const [renewMode, setRenewMode]           = useState('days')  // 'days' | 'date'
  const [renewDays, setRenewDays]           = useState('365')
  const [renewDate, setRenewDate]           = useState('')
  const [renewError, setRenewError]         = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['tenant', id], queryFn: () => fetchTenant(id) })
  const { data: partners = [] } = useQuery({
    queryKey: ['partners-active'],
    queryFn: fetchActivePartners,
    enabled: showEdit,
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status) => callAdminApi('admin-update-tenant-status', { tenant_id: id, status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant', id] }),
  })

  const updateTenantMutation = useMutation({
    mutationFn: (body) => callAdminApi('admin-update-tenant', { tenant_id: id, ...body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant', id] })
      setShowEdit(false)
      setEditError('')
    },
    onError: (e) => setEditError(e.message),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant', id] })
      setConfirmRevoke(null)
    },
  })

  const renewLicMutation = useMutation({
    mutationFn: ({ license_id, new_expires_at }) =>
      callAdminApi('admin-renew-license', { license_id, new_expires_at }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant', id] })
      setRenewTarget(null)
      setRenewError('')
    },
    onError: (e) => setRenewError(e.message),
  })

  function openRenew(lic) {
    const defaultDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    setRenewTarget(lic)
    setRenewMode('days')
    setRenewDays('365')
    setRenewDate(defaultDate)
    setRenewError('')
  }

  function computedExpiry() {
    if (renewMode === 'days') {
      const days = parseInt(renewDays, 10)
      if (!days || days <= 0) return null
      const d = new Date()
      d.setDate(d.getDate() + days)
      return d
    }
    if (renewDate) return new Date(renewDate)
    return null
  }

  function handleRenewSubmit(e) {
    e.preventDefault()
    setRenewError('')
    const expiry = computedExpiry()
    if (!expiry || isNaN(expiry.getTime())) {
      setRenewError('Please enter a valid date or number of days.')
      return
    }
    if (expiry <= new Date()) {
      setRenewError('New expiry must be in the future.')
      return
    }
    renewLicMutation.mutate({ license_id: renewTarget.id, new_expires_at: expiry.toISOString() })
  }

  function openEdit(tenant) {
    setEditForm({
      company_name:            tenant.company_name           ?? '',
      contact_email:           tenant.contact_email          ?? '',
      super_admin_email:       tenant.super_admin_email      ?? '',
      primary_contact_email:   tenant.primary_contact_email  ?? '',
      primary_contact_phone:   tenant.primary_contact_phone  ?? '',
      secondary_contact_email: tenant.secondary_contact_email ?? '',
      secondary_contact_phone: tenant.secondary_contact_phone ?? '',
      acquisition_type:        tenant.acquisition_type       ?? 'DIRECT',
      partner_id:              tenant.partner_id             ?? '',
      deal_amount:             tenant.deal_amount            ?? '',
      deal_currency:           tenant.deal_currency          ?? 'USD',
      deal_paid_at:            tenant.deal_paid_at           ?? '',
      contract_doc_url:        tenant.contract_doc_url       ?? '',
      internal_notes:          tenant.internal_notes         ?? '',
    })
    setEditError('')
    setShowEdit(true)
  }

  function handleEditSubmit(e) {
    e.preventDefault()
    setEditError('')
    updateTenantMutation.mutate({
      company_name:            editForm.company_name,
      contact_email:           editForm.contact_email,
      super_admin_email:       editForm.super_admin_email,
      primary_contact_email:   editForm.primary_contact_email,
      primary_contact_phone:   editForm.primary_contact_phone,
      secondary_contact_email: editForm.secondary_contact_email,
      secondary_contact_phone: editForm.secondary_contact_phone,
      acquisition_type:        editForm.acquisition_type,
      partner_id:              editForm.acquisition_type === 'PARTNER' ? editForm.partner_id : null,
      deal_amount:             editForm.deal_amount,
      deal_currency:           editForm.deal_currency,
      deal_paid_at:            editForm.deal_paid_at,
      contract_doc_url:        editForm.contract_doc_url,
      internal_notes:          editForm.internal_notes,
    })
  }

  function setF(field) {
    return (e) => setEditForm(f => ({ ...f, [field]: e.target.value }))
  }

  function copyToken(token) {
    navigator.clipboard.writeText(token)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  if (isLoading) return <div className="p-8 text-slate-400 text-sm">Loading...</div>
  const { tenant, licenses } = data ?? {}
  if (!tenant) return <div className="p-8 text-sm text-red-600">Tenant not found</div>

  const statusOptions = [
    { value: 'ACTIVE',     label: 'Active' },
    { value: 'INACTIVE',   label: 'Inactive' },
    { value: 'SUSPENDED',  label: 'Suspended' },
  ]

  const inputCls = 'block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900'
  const labelCls = 'block text-sm font-medium text-slate-700'

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <button onClick={() => navigate('/tenants')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft className="h-4 w-4" /> Tenants
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{tenant.company_name}</h1>
          <p className="text-sm font-mono text-slate-500 mt-0.5">{tenant.company_code}</p>
        </div>
        <div className="flex items-center gap-2">
          {tenant.acquisition_type === 'PARTNER' && <Badge variant="info">Partner</Badge>}
          <Badge variant={statusVariant[tenant.status] ?? 'default'}>{tenant.status}</Badge>
        </div>
      </div>

      {/* Account Details */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 text-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Account Details</h2>
          <button
            onClick={() => openEdit(tenant)}
            className="flex items-center gap-1.5 text-xs text-slate-500 border border-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        </div>
        <div className="space-y-2.5">
          <Detail label="Created"       value={new Date(tenant.created_at).toLocaleString()} />
          <Detail label="Contact Email" value={tenant.contact_email} />
          {tenant.activated_at    && <Detail label="Activated"    value={new Date(tenant.activated_at).toLocaleString()} />}
          {tenant.deactivated_at  && <Detail label="Deactivated"  value={new Date(tenant.deactivated_at).toLocaleString()} />}
          {tenant.project_url     && <Detail label="Project URL"  value={tenant.project_url} mono />}
          {tenant.super_admin_email && <Detail label="Super Admin" value={tenant.super_admin_email} />}
        </div>
      </div>

      {/* Contacts */}
      {(tenant.primary_contact_email || tenant.secondary_contact_email) && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 text-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Contacts</h2>
          <div className="space-y-2.5">
            {tenant.primary_contact_email   && <Detail label="Primary Email"   value={tenant.primary_contact_email} />}
            {tenant.primary_contact_phone   && <Detail label="Primary Phone"   value={tenant.primary_contact_phone} />}
            {tenant.secondary_contact_email && <Detail label="Secondary Email" value={tenant.secondary_contact_email} />}
            {tenant.secondary_contact_phone && <Detail label="Secondary Phone" value={tenant.secondary_contact_phone} />}
          </div>
        </div>
      )}

      {/* Deal Info */}
      {(tenant.deal_amount || tenant.partner_id || tenant.contract_doc_url || tenant.internal_notes) && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 text-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Deal Info</h2>
          <div className="space-y-2.5">
            <Detail label="Acquisition" value={tenant.acquisition_type ?? 'DIRECT'} />
            {tenant.partners && (
              <div className="flex gap-4">
                <span className="w-32 text-slate-500 shrink-0">Partner</span>
                <button className="text-blue-600 hover:underline text-sm font-medium" onClick={() => navigate(`/partners/${tenant.partner_id}`)}>
                  {tenant.partners.company_name}
                </button>
              </div>
            )}
            {tenant.deal_amount && (
              <Detail label="Deal Amount" value={`${Number(tenant.deal_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${tenant.deal_currency ?? 'USD'}`} />
            )}
            {tenant.deal_paid_at    && <Detail label="Deal Paid"     value={new Date(tenant.deal_paid_at).toLocaleDateString()} />}
            {tenant.contract_doc_url && (
              <div className="flex gap-4 items-center">
                <span className="w-32 text-slate-500 shrink-0">Contract Doc</span>
                <a href={tenant.contract_doc_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-sm">
                  Open <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
            {tenant.internal_notes && (
              <div className="flex gap-4">
                <span className="w-32 text-slate-500 shrink-0 pt-0.5">Notes</span>
                <p className="text-slate-700 whitespace-pre-wrap">{tenant.internal_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status change */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
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
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
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
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Mailboxes</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Expires</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Key</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {licenses.map(lic => (
                <tr key={lic.id}>
                  <td className="px-4 py-3"><Badge variant={statusVariant[lic.status] ?? 'default'}>{lic.status}</Badge></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{lic.license_type}</td>
                  <td className="px-4 py-3 text-slate-600">{lic.max_mailboxes}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(lic.expires_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => copyToken(lic.license_key)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                      {copiedToken === lic.license_key ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedToken === lic.license_key ? 'Copied' : 'Copy Key'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {['ACTIVATED', 'GENERATED'].includes(lic.status) && (
                        <button onClick={() => setViewLicDoc(lic)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800" title="View license document">
                          <FileText className="h-3.5 w-3.5" /> Doc
                        </button>
                      )}
                      {['ACTIVATED', 'EXPIRED'].includes(lic.status) && (
                        <button onClick={() => openRenew(lic)} className="flex items-center gap-1 text-xs text-emerald-600 hover:underline" title="Renew license">
                          <RefreshCw className="h-3.5 w-3.5" /> Renew
                        </button>
                      )}
                      {['GENERATED', 'ACTIVATED'].includes(lic.status) && (
                        <button onClick={() => setConfirmRevoke(lic)} className="text-xs text-red-600 hover:underline">
                          Revoke
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Edit Tenant Modal ─────────────────────────────────────────────────── */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Tenant Details" size="lg">
        <form onSubmit={handleEditSubmit} className="space-y-6">

          {/* Company */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Company Info</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <label className={labelCls}>Company Name</label>
                <input value={editForm.company_name} onChange={setF('company_name')} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Contact Email <span className="text-xs text-slate-400">(billing)</span></label>
                <input type="email" value={editForm.contact_email} onChange={setF('contact_email')} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Super Admin Email</label>
                <input type="email" value={editForm.super_admin_email} onChange={setF('super_admin_email')} className={inputCls} placeholder="Set manually if needed" />
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Contacts</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Primary Email</label>
                <input type="email" value={editForm.primary_contact_email} onChange={setF('primary_contact_email')} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Primary Phone</label>
                <input type="tel" value={editForm.primary_contact_phone} onChange={setF('primary_contact_phone')} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Secondary Email</label>
                <input type="email" value={editForm.secondary_contact_email} onChange={setF('secondary_contact_email')} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Secondary Phone</label>
                <input type="tel" value={editForm.secondary_contact_phone} onChange={setF('secondary_contact_phone')} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Deal */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Deal Info</p>
            <div className="space-y-3">
              <div className="flex gap-4">
                {['DIRECT', 'PARTNER'].map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="edit_acq" value={type}
                      checked={editForm.acquisition_type === type}
                      onChange={setF('acquisition_type')}
                      className="accent-slate-900"
                    />
                    <span className="text-sm text-slate-700">{type === 'DIRECT' ? 'Direct Sale' : 'Via Partner'}</span>
                  </label>
                ))}
              </div>

              {editForm.acquisition_type === 'PARTNER' && (
                <div className="space-y-1">
                  <label className={labelCls}>Partner</label>
                  <select value={editForm.partner_id} onChange={setF('partner_id')} className={inputCls}>
                    <option value="">Select a partner...</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>{p.company_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Deal Amount</label>
                  <input type="number" min={0} step="0.01" value={editForm.deal_amount} onChange={setF('deal_amount')} className={inputCls} placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Currency</label>
                  <select value={editForm.deal_currency} onChange={setF('deal_currency')} className={inputCls}>
                    <option>USD</option><option>EUR</option><option>GBP</option><option>AED</option><option>INR</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Deal Paid Date</label>
                  <input type="date" value={editForm.deal_paid_at} onChange={setF('deal_paid_at')} className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Contract Doc URL</label>
                  <input type="url" value={editForm.contract_doc_url} onChange={setF('contract_doc_url')} className={inputCls} placeholder="https://..." />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Internal Notes</p>
            <textarea value={editForm.internal_notes} onChange={setF('internal_notes')} rows={3} className={inputCls} placeholder="Internal context..." />
          </div>

          {editError && <p className="text-sm text-red-600">{editError}</p>}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={updateTenantMutation.isPending} className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
              {updateTenantMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Generate License Modal */}
      <Modal open={showCreateLic} onClose={() => setShowCreateLic(false)} title="Generate License">
        <form onSubmit={e => { e.preventDefault(); setLicError(''); createLicMutation.mutate(licForm) }} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">License Type</label>
            <select value={licForm.license_type} onChange={e => setLicForm(f => ({ ...f, license_type: e.target.value }))}
              className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
              <option value="STANDARD">Standard</option>
              <option value="PROFESSIONAL">Professional</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Max Mailboxes</label>
            <input type="number" min={1} required value={licForm.max_mailboxes}
              onChange={e => setLicForm(f => ({ ...f, max_mailboxes: Number(e.target.value) }))}
              className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Max Users</label>
            <input type="number" min={1} required value={licForm.max_users}
              onChange={e => setLicForm(f => ({ ...f, max_users: Number(e.target.value) }))}
              className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Expiry Date</label>
            <input type="date" required
              min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
              value={licForm.expires_at}
              onChange={e => setLicForm(f => ({ ...f, expires_at: e.target.value }))}
              className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
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

      {/* License Document viewer */}
      <LicenseDocument open={!!viewLicDoc} onClose={() => setViewLicDoc(null)} tenant={tenant} license={viewLicDoc} />

      {/* Renew License Modal */}
      <Modal open={!!renewTarget} onClose={() => setRenewTarget(null)} title="Renew License" size="sm">
        {renewTarget && (
          <form onSubmit={handleRenewSubmit} className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Current expiry</span>
                <span className="font-medium text-slate-800">{new Date(renewTarget.expires_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Type</span>
                <span className="font-medium text-slate-800">{renewTarget.license_type}</span>
              </div>
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
              {['days', 'date'].map(m => (
                <button
                  key={m} type="button"
                  onClick={() => setRenewMode(m)}
                  className={`flex-1 py-2 text-center transition-colors ${renewMode === m ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {m === 'days' ? 'Extend by days' : 'Pick a date'}
                </button>
              ))}
            </div>

            {renewMode === 'days' ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {['90', '180', '365'].map(d => (
                    <button key={d} type="button"
                      onClick={() => setRenewDays(d)}
                      className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors ${renewDays === d ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 hover:border-slate-500'}`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                <input
                  type="number" min={1} max={3650}
                  value={renewDays}
                  onChange={e => setRenewDays(e.target.value)}
                  placeholder="Custom days"
                  className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            ) : (
              <input
                type="date"
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                value={renewDate}
                onChange={e => setRenewDate(e.target.value)}
                className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            )}

            {/* Calculated new expiry preview */}
            {computedExpiry() && (
              <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
                <span className="text-emerald-700">New expiry</span>
                <span className="font-semibold text-emerald-800">{computedExpiry().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            )}

            {renewError && <p className="text-sm text-red-600">{renewError}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setRenewTarget(null)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={renewLicMutation.isPending}
                className="px-4 py-2 text-sm bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50">
                {renewLicMutation.isPending ? 'Renewing...' : 'Renew License'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirm Revoke Modal */}
      <Modal open={!!confirmRevoke} onClose={() => setConfirmRevoke(null)} title="Revoke License" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Are you sure you want to revoke this <strong>{confirmRevoke?.status}</strong> license?
            {confirmRevoke?.status === 'ACTIVATED' && (
              <span className="block mt-1 text-red-600 font-medium">This will immediately block the tenant from logging in.</span>
            )}
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setConfirmRevoke(null)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={() => revokeLicMutation.mutate(confirmRevoke.id)} disabled={revokeLicMutation.isPending}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {revokeLicMutation.isPending ? 'Revoking...' : 'Yes, Revoke'}
            </button>
          </div>
        </div>
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
