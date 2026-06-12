import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, ExternalLink, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { callAdminApi } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

const tenantStatusVariant = { ACTIVE: 'success', INACTIVE: 'default', SUSPENDED: 'danger' }

const emptyPayment = {
  tenant_id:       '',
  received_amount: '',
  currency:        'USD',
  received_date:   '',
  invoice_number:  '',
  payment_year:    '1',
  commission_rate: '',
  commission_amount: '',
  paid_date:       '',
  notes:           '',
}

async function fetchPartner(id) {
  const [{ data: partner }, { data: tenants }, { data: payments }] = await Promise.all([
    supabase.from('partners').select('*').eq('id', id).single(),
    supabase.from('tenants').select('id, company_name, company_code, status').eq('partner_id', id).order('company_name'),
    supabase
      .from('partner_payments')
      .select('*, tenants(company_name, company_code)')
      .eq('partner_id', id)
      .order('received_date', { ascending: false }),
  ])
  return { partner, tenants: tenants ?? [], payments: payments ?? [] }
}

export default function PartnerDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [payForm, setPayForm]                   = useState(emptyPayment)
  const [payError, setPayError]                 = useState('')
  const [confirmDelete, setConfirmDelete]       = useState(null) // payment to delete

  const { data, isLoading } = useQuery({ queryKey: ['partner', id], queryFn: () => fetchPartner(id) })

  // Auto-suggest commission rate when year or partner changes
  const partner = data?.partner
  useEffect(() => {
    if (!partner) return
    const year = parseInt(payForm.payment_year, 10)
    let suggestedRate = ''
    if (year === 1)          suggestedRate = String(partner.commission_rate_year1)
    else if (year >= 2 && year <= 5) suggestedRate = String(partner.commission_rate_ongoing)
    else if (year >= 6)      suggestedRate = '0'
    setPayForm(f => {
      const amount = parseFloat(f.received_amount) || 0
      const rate   = parseFloat(suggestedRate) || 0
      return {
        ...f,
        commission_rate:   suggestedRate,
        commission_amount: amount > 0 ? ((amount * rate) / 100).toFixed(2) : f.commission_amount,
      }
    })
  }, [payForm.payment_year, partner])

  // Recalculate commission_amount when amount or rate changes
  function handleAmountOrRateChange(field, value) {
    setPayForm(f => {
      const newF = { ...f, [field]: value }
      const amount = parseFloat(field === 'received_amount' ? value : f.received_amount) || 0
      const rate   = parseFloat(field === 'commission_rate'   ? value : f.commission_rate)   || 0
      newF.commission_amount = amount > 0 ? ((amount * rate) / 100).toFixed(2) : ''
      return newF
    })
  }

  const createPayMutation = useMutation({
    mutationFn: (body) => callAdminApi('admin-partner-payments', { action: 'create', partner_id: id, ...body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partner', id] })
      setShowPaymentModal(false)
      setPayForm(emptyPayment)
      setPayError('')
    },
    onError: (e) => setPayError(e.message),
  })

  const deletePayMutation = useMutation({
    mutationFn: (payment_id) => callAdminApi('admin-partner-payments', { action: 'delete', payment_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partner', id] })
      setConfirmDelete(null)
    },
  })

  function handlePaySubmit(e) {
    e.preventDefault()
    setPayError('')
    const payload = {
      received_amount: payForm.received_amount,
      currency:        payForm.currency,
      received_date:   payForm.received_date,
      payment_year:    payForm.payment_year,
      commission_rate: payForm.commission_rate,
    }
    if (payForm.tenant_id)       payload.tenant_id       = payForm.tenant_id
    if (payForm.invoice_number.trim()) payload.invoice_number = payForm.invoice_number.trim()
    if (payForm.paid_date)       payload.paid_date       = payForm.paid_date
    if (payForm.notes.trim())    payload.notes           = payForm.notes.trim()
    createPayMutation.mutate(payload)
  }

  function openPaymentModal() {
    setPayForm(emptyPayment)
    setPayError('')
    setShowPaymentModal(true)
  }

  if (isLoading) return <div className="p-8 text-slate-400 text-sm">Loading...</div>
  const { tenants = [], payments = [] } = data ?? {}
  if (!partner) return <div className="p-8 text-sm text-red-600">Partner not found</div>

  const totalCommission = payments.reduce((sum, p) => sum + parseFloat(p.commission_amount || 0), 0)
  const totalReceived   = payments.reduce((sum, p) => sum + parseFloat(p.received_amount   || 0), 0)

  const inputCls = 'block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900'
  const labelCls = 'block text-sm font-medium text-slate-700'

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <button onClick={() => navigate('/partners')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft className="h-4 w-4" /> Partners
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{partner.company_name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{partner.primary_contact_email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={partner.is_active ? 'success' : 'default'}>{partner.is_active ? 'Active' : 'Inactive'}</Badge>
          <button
            onClick={() => navigate('/partners')}
            className="flex items-center gap-1 text-xs text-slate-500 border border-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit (from list)
          </button>
        </div>
      </div>

      {/* Partner Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Partner Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <Detail label="Primary Email"   value={partner.primary_contact_email} />
          {partner.primary_contact_phone   && <Detail label="Primary Phone"   value={partner.primary_contact_phone} />}
          {partner.secondary_contact_email && <Detail label="Secondary Email" value={partner.secondary_contact_email} />}
          {partner.secondary_contact_phone && <Detail label="Secondary Phone" value={partner.secondary_contact_phone} />}
          <Detail label="Year 1 Rate"    value={`${partner.commission_rate_year1}%`} />
          <Detail label="Ongoing Rate"   value={`${partner.commission_rate_ongoing}% (Years 2–5)`} />
          <Detail label="Since Year 6"   value="0% (no commission)" />
          {partner.doc_folder_url && (
            <div className="flex gap-3 items-center">
              <span className="w-32 text-slate-500 shrink-0">Doc Folder</span>
              <a href={partner.doc_folder_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline text-sm">
                Open <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
          {partner.partner_terms && (
            <div className="md:col-span-2 flex gap-3">
              <span className="w-32 text-slate-500 shrink-0 pt-0.5">Terms</span>
              <p className="text-slate-700 whitespace-pre-wrap">{partner.partner_terms}</p>
            </div>
          )}
        </div>
      </div>

      {/* Linked Tenants */}
      <div className="bg-white rounded-xl border border-slate-200 mb-5">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">Linked Tenants ({tenants.length})</h2>
        </div>
        {tenants.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">No tenants linked to this partner</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Company</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/tenants/${t.id}`)}>
                  <td className="px-4 py-3 font-medium text-slate-900">{t.company_name}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{t.company_code}</td>
                  <td className="px-4 py-3"><Badge variant={tenantStatusVariant[t.status] ?? 'default'}>{t.status}</Badge></td>
                  <td className="px-4 py-3 text-slate-400 text-right"><ArrowLeft className="h-4 w-4 rotate-180 inline" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment Log */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Payment Log ({payments.length})</h2>
            {payments.length > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">
                Total received: <span className="font-medium text-slate-600">${totalReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                {' · '}
                Total commission owed: <span className="font-medium text-amber-600">${totalCommission.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </p>
            )}
          </div>
          <button
            onClick={openPaymentModal}
            className="flex items-center gap-1.5 text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700"
          >
            <Plus className="h-3.5 w-3.5" /> Log Payment
          </button>
        </div>

        {payments.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">No payments logged yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Received Date</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Tenant</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Invoice #</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Year</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Received</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Rate</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Commission</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Paid Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{new Date(p.received_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.tenants ? (
                        <button
                          className="text-blue-600 hover:underline text-left"
                          onClick={() => navigate(`/tenants/${p.tenant_id}`)}
                        >
                          {p.tenants.company_name}
                          <span className="ml-1 text-xs text-slate-400 font-mono">({p.tenants.company_code})</span>
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.invoice_number || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">Year {p.payment_year}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {parseFloat(p.received_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {p.currency}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">{p.commission_rate}%</td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-600">
                      {parseFloat(p.commission_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {p.currency}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {p.paid_date ? new Date(p.paid_date).toLocaleDateString() : <span className="text-amber-500 text-xs">Unpaid</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setConfirmDelete(p)}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Payment Modal */}
      <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Log Payment" size="lg">
        <form onSubmit={handlePaySubmit} className="space-y-5">

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Payment Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Received Date <span className="text-red-500">*</span></label>
                <input required type="date" value={payForm.received_date}
                  onChange={e => setPayForm(f => ({ ...f, received_date: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Invoice Number</label>
                <input value={payForm.invoice_number}
                  onChange={e => setPayForm(f => ({ ...f, invoice_number: e.target.value }))}
                  className={inputCls} placeholder="INV-2024-001"
                />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Amount Received <span className="text-red-500">*</span></label>
                <input required type="number" min={0.01} step="0.01"
                  value={payForm.received_amount}
                  onChange={e => handleAmountOrRateChange('received_amount', e.target.value)}
                  className={inputCls} placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Currency</label>
                <select value={payForm.currency} onChange={e => setPayForm(f => ({ ...f, currency: e.target.value }))} className={inputCls}>
                  <option>USD</option><option>EUR</option><option>GBP</option><option>AED</option><option>INR</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Tenant & Year</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Tenant (optional)</label>
                <select value={payForm.tenant_id} onChange={e => setPayForm(f => ({ ...f, tenant_id: e.target.value }))} className={inputCls}>
                  <option value="">— General / not linked —</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.company_name} ({t.company_code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Payment Year <span className="text-red-500">*</span></label>
                <select
                  required
                  value={payForm.payment_year}
                  onChange={e => setPayForm(f => ({ ...f, payment_year: e.target.value }))}
                  className={inputCls}
                >
                  {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
                  <option value="6">Year 6+ (0% commission)</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Commission</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Commission Rate (%)</label>
                <input type="number" min={0} max={100} step="0.01"
                  value={payForm.commission_rate}
                  onChange={e => handleAmountOrRateChange('commission_rate', e.target.value)}
                  className={inputCls}
                />
                <p className="text-xs text-slate-400">Auto-suggested based on year</p>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Commission Amount</label>
                <input type="number" min={0} step="0.01"
                  value={payForm.commission_amount}
                  onChange={e => setPayForm(f => ({ ...f, commission_amount: e.target.value }))}
                  className={`${inputCls} bg-slate-50`}
                />
                <p className="text-xs text-slate-400">Auto-calculated; override if needed</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Commission Paid</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Paid to Partner Date</label>
                <input type="date" value={payForm.paid_date}
                  onChange={e => setPayForm(f => ({ ...f, paid_date: e.target.value }))}
                  className={inputCls}
                />
                <p className="text-xs text-slate-400">Leave blank if unpaid</p>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Notes</label>
                <input value={payForm.notes}
                  onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
                  className={inputCls} placeholder="Optional remarks..."
                />
              </div>
            </div>
          </div>

          {payError && <p className="text-sm text-red-600">{payError}</p>}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={createPayMutation.isPending} className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
              {createPayMutation.isPending ? 'Saving...' : 'Log Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Payment" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Delete payment of <strong>{parseFloat(confirmDelete?.received_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} {confirmDelete?.currency}</strong> received on{' '}
            <strong>{confirmDelete?.received_date}</strong>?
            This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button
              onClick={() => deletePayMutation.mutate(confirmDelete.id)}
              disabled={deletePayMutation.isPending}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {deletePayMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div className="flex gap-3">
      <span className="w-32 text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  )
}
