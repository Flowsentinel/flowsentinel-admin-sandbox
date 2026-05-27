import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/Badge'

const statusVariant = { OPEN: 'warning', IN_PROGRESS: 'info', CLOSED: 'default' }
const priorityVariant = { LOW: 'default', MEDIUM: 'info', HIGH: 'warning', CRITICAL: 'danger' }

async function fetchTickets() {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, subject, status, priority, created_at, tenant_id, tenants(company_name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export default function Tickets() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const { data: tickets = [], isLoading } = useQuery({ queryKey: ['tickets'], queryFn: fetchTickets })

  const filtered = tickets.filter(t => {
    const matchSearch = t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.tenants?.company_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Tickets</h1>
        <p className="text-sm text-slate-500 mt-0.5">{tickets.length} total</p>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tickets..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <select
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="ALL">All</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No tickets found</div>
        ) : (
          <table className="w-full text-sm min-w-[580px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Subject</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tenant</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(ticket => (
                <tr key={ticket.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                  <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">{ticket.subject}</td>
                  <td className="px-4 py-3 text-slate-500">{ticket.tenants?.company_name}</td>
                  <td className="px-4 py-3"><Badge variant={priorityVariant[ticket.priority] ?? 'default'}>{ticket.priority}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={statusVariant[ticket.status] ?? 'default'}>{ticket.status}</Badge></td>
                  <td className="px-4 py-3 text-slate-400">{new Date(ticket.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-400"><ChevronRight className="h-4 w-4" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
