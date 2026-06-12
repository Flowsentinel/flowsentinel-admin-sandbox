import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronRight, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { callAdminApi } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

const emptyForm = {
  company_name:            '',
  primary_contact_email:   '',
  primary_contact_phone:   '',
  secondary_contact_email: '',
  secondary_contact_phone: '',
  partner_terms:           '',
  commission_rate_year1:   '',
  commission_rate_ongoing: '',
  doc_folder_url:          '',
  is_active:               true,
}

async function fetchPartners() {
  const { data, error } = await supabase
    .from('partners')
    .select('id, company_name, primary_contact_email, commission_rate_year1, commission_rate_ongoing, is_active, created_at, tenants(id)')
    .order('company_name')
  if (error) throw error
  return data ?? []
}

export default function Partners() {
  const qc       = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch]         = useState('')
  const [modalMode, setModalMode]   = useState(null) // 'create' | 'edit'
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm]             = useState(emptyForm)
  const [formError, setFormError]   = useState('')

  const { data: partners = [], isLoading } = useQuery({ queryKey: ['partners'], queryFn: fetchPartners })

  const createMutation = useMutation({
    mutationFn: (body) => callAdminApi('admin-partners', { action: 'create', ...body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partners'] })
      closeModal()
    },
    onError: (e) => setFormError(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: (body) => callAdminApi('admin-partners', { action: 'update', ...body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partners'] })
      closeModal()
    },
    onError: (e) => setFormError(e.message),
  })

  function openCreate() {
    setForm(emptyForm)
    setFormError('')
    setEditTarget(null)
    setModalMode('create')
  }

  function openEdit(partner, e) {
    e.stopPropagation()
    setForm({
      company_name:            partner.company_name,
      primary_contact_email:   partner.primary_contact_email ?? '',
      primary_contact_phone:   partner.primary_contact_phone ?? '',
      secondary_contact_email: partner.secondary_contact_email ?? '',
      secondary_contact_phone: partner.secondary_contact_phone ?? '',
      partner_terms:           partner.partner_terms ?? '',
      commission_rate_year1:   String(partner.commission_rate_year1 ?? ''),
      commission_rate_ongoing: String(partner.commission_rate_ongoing ?? ''),
      doc_folder_url:          partner.doc_folder_url ?? '',
      is_active:               partner.is_active,
    })
    setFormError('')
    setEditTarget(partner)
    setModalMode('edit')
  }

  function closeModal() {
    setModalMode(null)
    setEditTarget(null)
    setFormError('')
  }

  function set(field) {
    return (e) => {
      const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
      setForm(f => ({ ...f, [field]: val }))
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const payload = {
      company_name:            form.company_name.trim(),
      primary_contact_email:   form.primary_contact_email.trim(),
      commission_rate_year1:   form.commission_rate_year1,
      commission_rate_ongoing: form.commission_rate_ongoing,
    }
    if (form.primary_contact_phone.trim())   payload.primary_contact_phone   = form.primary_contact_phone.trim()
    if (form.secondary_contact_email.trim()) payload.secondary_contact_email = form.secondary_contact_email.trim()
    if (form.secondary_contact_phone.trim()) payload.secondary_contact_phone = form.secondary_contact_phone.trim()
    if (form.partner_terms.trim())           payload.partner_terms           = form.partner_terms.trim()
    if (form.doc_folder_url.trim())          payload.doc_folder_url          = form.doc_folder_url.trim()

    if (modalMode === 'create') {
      createMutation.mutate(payload)
    } else {
      updateMutation.mutate({ partner_id: editTarget.id, ...payload, is_active: form.is_active })
    }
  }

  const filtered = partners.filter(p =>
    p.company_name.toLowerCase().includes(search.toLowerCase()) ||
    p.primary_contact_email?.toLowerCase().includes(search.toLowerCase())
  )

  const isPending = createMutation.isPending || updateMutation.isPending
  const inputCls  = 'block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900'
  const labelCls  = 'block text-sm font-medium text-slate-700'

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Partners</h1>
          <p className="text-sm text-slate-500 mt-0.5">{partners.length} total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Partner
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search partners..."
          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No partners found</div>
        ) : (
          <table className="w-full text-sm min-w-[680px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Partner</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Contact</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Year 1 %</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Ongoing %</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Tenants</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate(`/partners/${p.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">{p.company_name}</td>
                  <td className="px-4 py-3 text-slate-500">{p.primary_contact_email}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{p.commission_rate_year1}%</td>
                  <td className="px-4 py-3 text-right text-slate-600">{p.commission_rate_ongoing}%</td>
                  <td className="px-4 py-3 text-right text-slate-500">{p.tenants?.length ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.is_active ? 'success' : 'default'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={e => openEdit(p, e)}
                        className="text-slate-400 hover:text-slate-700"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={!!modalMode}
        onClose={closeModal}
        title={modalMode === 'create' ? 'Add Partner' : 'Edit Partner'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Company */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Company</p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className={labelCls}>Company Name <span className="text-red-500">*</span></label>
                <input required value={form.company_name} onChange={set('company_name')} className={inputCls} placeholder="Partner Co." />
              </div>
              {modalMode === 'edit' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox" checked={form.is_active} onChange={set('is_active')}
                    className="accent-slate-900 h-4 w-4"
                  />
                  <span className="text-sm text-slate-700">Active partner</span>
                </label>
              )}
            </div>
          </div>

          {/* Contacts */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Contacts</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Primary Email <span className="text-red-500">*</span></label>
                <input required type="email" value={form.primary_contact_email} onChange={set('primary_contact_email')} className={inputCls} placeholder="contact@partner.com" />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Primary Phone</label>
                <input type="tel" value={form.primary_contact_phone} onChange={set('primary_contact_phone')} className={inputCls} placeholder="+1 555 000 0000" />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Secondary Email</label>
                <input type="email" value={form.secondary_contact_email} onChange={set('secondary_contact_email')} className={inputCls} placeholder="alt@partner.com" />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Secondary Phone</label>
                <input type="tel" value={form.secondary_contact_phone} onChange={set('secondary_contact_phone')} className={inputCls} placeholder="+1 555 000 0001" />
              </div>
            </div>
          </div>

          {/* Commission */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Commission Rates</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Year 1 Rate (%)</label>
                <input
                  type="number" min={0} max={100} step="0.01"
                  value={form.commission_rate_year1} onChange={set('commission_rate_year1')}
                  className={inputCls} placeholder="40"
                />
                <p className="text-xs text-slate-400">Applied in year 1</p>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Ongoing Rate (%) Years 2–5</label>
                <input
                  type="number" min={0} max={100} step="0.01"
                  value={form.commission_rate_ongoing} onChange={set('commission_rate_ongoing')}
                  className={inputCls} placeholder="20"
                />
                <p className="text-xs text-slate-400">Year 6+ is always 0%</p>
              </div>
            </div>
          </div>

          {/* Docs */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Documents & Terms</p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className={labelCls}>Doc Folder URL</label>
                <input type="url" value={form.doc_folder_url} onChange={set('doc_folder_url')} className={inputCls} placeholder="https://drive.google.com/..." />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Partner Terms / Notes</label>
                <textarea value={form.partner_terms} onChange={set('partner_terms')} rows={3} className={inputCls} placeholder="Agreement terms, special conditions..." />
              </div>
            </div>
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
              {isPending ? 'Saving...' : (modalMode === 'create' ? 'Add Partner' : 'Save Changes')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
