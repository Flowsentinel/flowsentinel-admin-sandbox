import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { callAdminApi } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'

async function fetchTamperEvents() {
  const { data, error } = await supabase
    .from('tamper_events')
    .select('*, tenants(company_name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export default function TamperEvents() {
  const qc = useQueryClient()
  const { data: events = [], isLoading } = useQuery({ queryKey: ['tamper-events'], queryFn: fetchTamperEvents })

  const acknowledgeMutation = useMutation({
    mutationFn: (id) => callAdminApi('admin-acknowledge-tamper', { tamper_event_id: id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tamper-events'] }),
  })

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Tamper Events</h1>
        <p className="text-sm text-slate-500 mt-0.5">{events.filter(e => !e.acknowledged_at).length} unacknowledged</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No tamper events</div>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tenant</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Details</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Detected</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map(ev => (
                <tr key={ev.id} className={!ev.acknowledged_at ? 'bg-red-50' : ''}>
                  <td className="px-4 py-3 font-medium text-slate-900">{ev.tenants?.company_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{ev.event_type}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">
                    {JSON.stringify(ev.details)}
                  </td>
                  <td className="px-4 py-3">
                    {ev.acknowledged_at
                      ? <Badge variant="success">Acknowledged</Badge>
                      : <Badge variant="danger">Unacknowledged</Badge>
                    }
                  </td>
                  <td className="px-4 py-3 text-slate-400">{new Date(ev.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {!ev.acknowledged_at && (
                      <button
                        onClick={() => acknowledgeMutation.mutate(ev.id)}
                        disabled={acknowledgeMutation.isPending}
                        className="flex items-center gap-1 text-xs text-green-700 hover:underline"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> Acknowledge
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
