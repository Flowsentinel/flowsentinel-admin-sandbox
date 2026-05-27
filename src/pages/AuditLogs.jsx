import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'

async function fetchAuditLogs() {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return data
}

export default function AuditLogs() {
  const [search, setSearch] = useState('')
  const { data: logs = [], isLoading } = useQuery({ queryKey: ['audit-logs'], queryFn: fetchAuditLogs })

  const filtered = logs.filter(l =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.actor_email?.toLowerCase().includes(search.toLowerCase()) ||
    l.resource_type?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-0.5">Last 500 events</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by action, actor, or resource..."
          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No logs found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Action</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Actor</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Resource</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Details</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-slate-800">{log.action}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{log.actor_email}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {log.resource_type}
                    {log.resource_id && <span className="ml-1 text-slate-300">{log.resource_id.slice(0, 8)}</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">
                    {Object.keys(log.details ?? {}).length > 0 ? JSON.stringify(log.details) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
