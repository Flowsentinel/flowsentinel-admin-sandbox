import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { callAdminApi } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

const statusVariant = { ACTIVE: 'success', INACTIVE: 'default', SUSPENDED: 'danger' }

async function fetchTenants() {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, company_code, company_name, status, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export default function Tenants() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ company_code: '', company_name: '', contact_email: '' })
  const [formError, setFormError] = useState('')

  const { data: tenants = [], isLoading } = useQuery({ queryKey: ['tenants'], queryFn: fetchTenants })

  const createMutation = useMutation({
    mutationFn: (body) => callAdminApi('admin-create-tenant', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] })
      setShowCreate(false)
      setForm({ company_code: '', company_name: '', contact_email: '' })
      setFormError('')
    },
    onError: (e) => setFormError(e.message),
  })

  const filtered = tenants.filter(t =>
    t.company_name.toLowerCase().includes(search.toLowerCase()) ||
    t.company_code.toLowerCase().includes(search.toLowerCase())
  )

  function handleCreate(e) {
    e.preventDefault()
    setFormError('')
    createMutation.mutate(form)
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tenants</h1>
          <p className="text-sm text-slate-500 mt-0.5">{tenants.length} total</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Tenant
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tenants..."
          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No tenants found</div>
        ) : (
          <table className="w-full text-sm min-w-[580px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Company</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/tenants/${t.id}`)}>
                  <td className="px-4 py-3 font-medium text-slate-900">{t.company_name}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono">{t.company_code}</td>
                  <td className="px-4 py-3"><Badge variant={statusVariant[t.status] ?? 'default'}>{t.status}</Badge></td>
                  <td className="px-4 py-3 text-slate-400">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-400"><ChevronRight className="h-4 w-4" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Tenant" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Company Name</label>
            <input
              required value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
              className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="Acme Corp"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Contact Email</label>
            <input
              required type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
              className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="admin@company.com"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Company Code</label>
            <input
              required value={form.company_code} onChange={e => setForm(f => ({ ...f, company_code: e.target.value.toUpperCase() }))}
              className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="ACME"
              maxLength={8}
            />
            <p className="text-xs text-slate-400">2–8 alphanumeric characters</p>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
