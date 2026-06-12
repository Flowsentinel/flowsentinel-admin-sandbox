import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { callAdminApi } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

const statusVariant = { ACTIVE: 'success', INACTIVE: 'default', SUSPENDED: 'danger' }

const emptyForm = {
  // Required
  company_name:    '',
  company_code:    '',
  contact_email:   '',
  // Contacts
  primary_contact_email:    '',
  primary_contact_phone:    '',
  secondary_contact_email:  '',
  secondary_contact_phone:  '',
  // Deal
  acquisition_type: 'DIRECT',
  partner_id:       '',
  deal_amount:      '',
  deal_currency:    'USD',
  deal_paid_at:     '',
  contract_doc_url: '',
  // Notes
  internal_notes:   '',
}

async function fetchTenants() {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, company_code, company_name, status, acquisition_type, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

async function fetchActivePartners() {
  const { data, error } = await supabase
    .from('partners')
    .select('id, company_name')
    .eq('is_active', true)
    .order('company_name')
  if (error) throw error
  return data ?? []
}

export default function Tenants() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch]         = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]             = useState(emptyForm)
  const [formError, setFormError]   = useState('')

  const { data: tenants = [], isLoading } = useQuery({ queryKey: ['tenants'], queryFn: fetchTenants })
  const { data: partners = [] } = useQuery({ queryKey: ['partners-active'], queryFn: fetchActivePartners, enabled: showCreate })

  const createMutation = useMutation({
    mutationFn: (body) => callAdminApi('admin-create-tenant', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] })
      setShowCreate(false)
      setForm(emptyForm)
      setFormError('')
    },
    onError: (e) => setFormError(e.message),
  })

  const filtered = tenants.filter(t =>
    t.company_name.toLowerCase().includes(search.toLowerCase()) ||
    t.company_code.toLowerCase().includes(search.toLowerCase())
  )

  function set(field) {
    return (e) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function handleCreate(e) {
    e.preventDefault()
    setFormError('')
    const payload = {
      company_name:    form.company_name.trim(),
      company_code:    form.company_code.trim().toUpperCase(),
      contact_email:   form.contact_email.trim(),
      acquisition_type: form.acquisition_type,
    }
    if (form.primary_contact_email.trim())   payload.primary_contact_email   = form.primary_contact_email.trim()
    if (form.primary_contact_phone.trim())   payload.primary_contact_phone   = form.primary_contact_phone.trim()
    if (form.secondary_contact_email.trim()) payload.secondary_contact_email = form.secondary_contact_email.trim()
    if (form.secondary_contact_phone.trim()) payload.secondary_contact_phone = form.secondary_contact_phone.trim()
    if (form.acquisition_type === 'PARTNER' && form.partner_id) payload.partner_id = form.partner_id
    if (form.deal_amount.trim())    payload.deal_amount    = form.deal_amount.trim()
    if (form.deal_currency.trim())  payload.deal_currency  = form.deal_currency.trim()
    if (form.deal_paid_at)          payload.deal_paid_at   = form.deal_paid_at
    if (form.contract_doc_url.trim()) payload.contract_doc_url = form.contract_doc_url.trim()
    if (form.internal_notes.trim()) payload.internal_notes = form.internal_notes.trim()
    createMutation.mutate(payload)
  }

  const inputCls = 'block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900'
  const labelCls = 'block text-sm font-medium text-slate-700'

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
                <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
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
                  <td className="px-4 py-3">
                    <Badge variant={t.acquisition_type === 'PARTNER' ? 'info' : 'default'}>
                      {t.acquisition_type ?? 'DIRECT'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-400"><ChevronRight className="h-4 w-4" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Create Tenant Modal ────────────────────────────────────────────────── */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setFormError('') }} title="Create Tenant" size="lg">
        <form onSubmit={handleCreate} className="space-y-6">

          {/* --- Company Info --- */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Company Info</p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className={labelCls}>Company Name <span className="text-red-500">*</span></label>
                <input required value={form.company_name} onChange={set('company_name')} className={inputCls} placeholder="Acme Corp" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Contact Email <span className="text-red-500">*</span></label>
                  <input required type="email" value={form.contact_email} onChange={set('contact_email')} className={inputCls} placeholder="admin@company.com" />
                  <p className="text-xs text-slate-400">Billing / account email</p>
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Company Code <span className="text-red-500">*</span></label>
                  <input
                    required value={form.company_code}
                    onChange={e => setForm(f => ({ ...f, company_code: e.target.value.toUpperCase() }))}
                    className={`${inputCls} font-mono`} placeholder="ACME" maxLength={8}
                  />
                  <p className="text-xs text-slate-400">2–8 alphanumeric chars</p>
                </div>
              </div>
            </div>
          </div>

          {/* --- Contacts --- */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Contacts (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Primary Contact Email</label>
                <input type="email" value={form.primary_contact_email} onChange={set('primary_contact_email')} className={inputCls} placeholder="primary@company.com" />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Primary Contact Phone</label>
                <input type="tel" value={form.primary_contact_phone} onChange={set('primary_contact_phone')} className={inputCls} placeholder="+1 555 000 0000" />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Secondary Contact Email</label>
                <input type="email" value={form.secondary_contact_email} onChange={set('secondary_contact_email')} className={inputCls} placeholder="secondary@company.com" />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Secondary Contact Phone</label>
                <input type="tel" value={form.secondary_contact_phone} onChange={set('secondary_contact_phone')} className={inputCls} placeholder="+1 555 000 0001" />
              </div>
            </div>
          </div>

          {/* --- Deal Info --- */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Deal Info (optional)</p>
            <div className="space-y-3">
              {/* Acquisition Type */}
              <div className="flex gap-4">
                {['DIRECT', 'PARTNER'].map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio" name="acquisition_type"
                      value={type} checked={form.acquisition_type === type}
                      onChange={set('acquisition_type')}
                      className="accent-slate-900"
                    />
                    <span className="text-sm text-slate-700">{type === 'DIRECT' ? 'Direct Sale' : 'Via Partner'}</span>
                  </label>
                ))}
              </div>

              {/* Partner selector */}
              {form.acquisition_type === 'PARTNER' && (
                <div className="space-y-1">
                  <label className={labelCls}>Partner <span className="text-red-500">*</span></label>
                  <select
                    required={form.acquisition_type === 'PARTNER'}
                    value={form.partner_id} onChange={set('partner_id')}
                    className={inputCls}
                  >
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
                  <input type="number" min={0} step="0.01" value={form.deal_amount} onChange={set('deal_amount')} className={inputCls} placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Currency</label>
                  <select value={form.deal_currency} onChange={set('deal_currency')} className={inputCls}>
                    <option>USD</option>
                    <option>EUR</option>
                    <option>GBP</option>
                    <option>AED</option>
                    <option>INR</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Deal Paid Date</label>
                  <input type="date" value={form.deal_paid_at} onChange={set('deal_paid_at')} className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Contract Doc URL</label>
                  <input type="url" value={form.contract_doc_url} onChange={set('contract_doc_url')} className={inputCls} placeholder="https://drive.google.com/..." />
                </div>
              </div>
            </div>
          </div>

          {/* --- Notes --- */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Internal Notes (optional)</p>
            <textarea
              value={form.internal_notes} onChange={set('internal_notes')}
              rows={3} className={inputCls}
              placeholder="Any internal context about this account..."
            />
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setShowCreate(false); setFormError('') }}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
