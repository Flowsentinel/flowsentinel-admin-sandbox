import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/Badge'

// Considers a tenant stale if no heartbeat for more than 25 hours
const STALE_THRESHOLD_MS = 25 * 60 * 60 * 1000

const heartbeatVariant = {
  HEALTHY:      'success',
  GRACE_PERIOD: 'warning',
  EXPIRED:      'danger',
  TAMPERED:     'danger',
  FAILED:       'danger',
}

const tenantStatusVariant = {
  ACTIVE:              'success',
  INACTIVE:            'default',
  SUSPENDED:           'danger',
  LICENSE_EXPIRED:     'warning',
  PENDING_ACTIVATION:  'info',
}

function formatTimeAgo(isoString) {
  if (!isoString) return null
  const ms = Date.now() - new Date(isoString).getTime()
  const mins  = Math.floor(ms / 60_000)
  const hours = Math.floor(ms / 3_600_000)
  const days  = Math.floor(ms / 86_400_000)
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

async function fetchHealth() {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, company_name, company_code, status, last_heartbeat_at, last_heartbeat_status, consecutive_failures')
    .order('company_name', { ascending: true })
  if (error) throw error
  return data
}

export default function TenantHealth() {
  const { data: tenants = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['tenant-health'],
    queryFn: fetchHealth,
    refetchInterval: 60_000, // auto-refresh every minute
  })

  const now = Date.now()
  const totalActive   = tenants.filter(t => t.status === 'ACTIVE').length
  const totalHealthy  = tenants.filter(t => t.last_heartbeat_status === 'HEALTHY').length
  const totalStale    = tenants.filter(t =>
    t.last_heartbeat_at && (now - new Date(t.last_heartbeat_at).getTime()) > STALE_THRESHOLD_MS
  ).length
  const totalTampered = tenants.filter(t => t.last_heartbeat_status === 'TAMPERED').length

  return (
    <div className="p-4 md:p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tenant Health</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Live heartbeat feed — updated each time a tenant's cron runs
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Active tenants"  value={totalActive}   color="slate" />
        <SummaryCard label="Healthy"         value={totalHealthy}  color="green" />
        <SummaryCard label="Stale (>25h)"    value={totalStale}    color="amber" />
        <SummaryCard label="Tamper detected" value={totalTampered} color="red"   />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : tenants.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No tenants found</div>
        ) : (
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Company</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Account status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Health</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Last heartbeat</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Failures</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map(t => {
                const isStale = t.last_heartbeat_at
                  ? (now - new Date(t.last_heartbeat_at).getTime()) > STALE_THRESHOLD_MS
                  : false
                const neverReported = !t.last_heartbeat_at
                const timeAgo = formatTimeAgo(t.last_heartbeat_at)

                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{t.company_name}</p>
                      <p className="text-xs font-mono text-slate-400">{t.company_code}</p>
                    </td>

                    <td className="px-4 py-3">
                      <Badge variant={tenantStatusVariant[t.status] ?? 'default'}>
                        {t.status.replace('_', ' ')}
                      </Badge>
                    </td>

                    <td className="px-4 py-3">
                      {neverReported ? (
                        <Badge variant="default">Never reported</Badge>
                      ) : (
                        <Badge variant={heartbeatVariant[t.last_heartbeat_status] ?? 'default'}>
                          {t.last_heartbeat_status}
                        </Badge>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {neverReported ? (
                        <span className="text-slate-400 text-xs">—</span>
                      ) : (
                        <span className={`text-xs ${isStale ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                          {timeAgo}
                          {isStale && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 text-amber-600">
                              <AlertTriangle className="h-3 w-3" /> stale
                            </span>
                          )}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {t.consecutive_failures > 0 ? (
                        <span className="text-xs font-semibold text-red-600">
                          {t.consecutive_failures} in a row
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">0</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <SignalDots status={neverReported ? null : t.last_heartbeat_status} stale={isStale} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-4">
        Heartbeats are sent once per day when the tenant's cron runs (~02:00 UTC).
        A tenant is considered stale if no heartbeat has been received in the last 25 hours.
      </p>
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  const colors = {
    slate: 'bg-white border-slate-200 text-slate-900',
    green: 'bg-green-50 border-green-200 text-green-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red:   'bg-red-50 border-red-200 text-red-700',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-2xl font-bold leading-none mb-1">{value}</p>
      <p className="text-xs font-medium opacity-70">{label}</p>
    </div>
  )
}

function SignalDots({ status, stale }) {
  if (!status) {
    return (
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-2.5 w-2.5 rounded-sm bg-slate-200" />
        ))}
      </div>
    )
  }

  const dotColor =
    stale           ? 'bg-amber-400' :
    status === 'HEALTHY'      ? 'bg-green-400' :
    status === 'GRACE_PERIOD' ? 'bg-amber-400' :
    'bg-red-400'

  return (
    <div className="flex gap-1 items-end">
      {[40, 60, 80, 100].map((h, i) => (
        <div
          key={i}
          className={`w-2 rounded-sm ${dotColor}`}
          style={{ height: `${h * 0.14}rem`, opacity: status === 'HEALTHY' && !stale ? 1 : 0.4 + i * 0.15 }}
        />
      ))}
    </div>
  )
}
