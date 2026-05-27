import { useQuery } from '@tanstack/react-query'
import { Building2, Key, Ticket, ShieldAlert, TrendingUp, Activity } from 'lucide-react'
import { supabase } from '@/lib/supabase'

async function fetchStats() {
  const [tenants, licenses, tickets, tamper] = await Promise.all([
    supabase.from('tenants').select('id, status'),
    supabase.from('licenses').select('id, status, expires_at'),
    supabase.from('support_tickets').select('id, status'),
    supabase.from('tamper_events').select('id, acknowledged_at'),
  ])
  const tenantList  = tenants.data  ?? []
  const licenseList = licenses.data ?? []
  const ticketList  = tickets.data  ?? []
  const tamperList  = tamper.data   ?? []

  const now = new Date()
  const in30Days = new Date(now.getTime() + 30 * 86400_000)

  return {
    totalTenants:         tenantList.length,
    activeTenants:        tenantList.filter(t => t.status === 'ACTIVE').length,
    suspendedTenants:     tenantList.filter(t => t.status === 'SUSPENDED').length,
    totalLicenses:        licenseList.length,
    activeLicenses:       licenseList.filter(l => l.status === 'ACTIVATED').length,
    expiringLicenses:     licenseList.filter(l => l.status === 'ACTIVATED' && new Date(l.expires_at) <= in30Days).length,
    openTickets:          ticketList.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length,
    unacknowledgedTamper: tamperList.filter(t => !t.acknowledged_at).length,
  }
}

function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor, highlight }) {
  return (
    <div className={`bg-white rounded-xl border p-5 ${highlight ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${highlight ? 'text-red-600' : 'text-slate-900'}`}>
            {value ?? '—'}
          </p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-3 w-20 bg-slate-200 rounded" />
          <div className="h-8 w-12 bg-slate-200 rounded" />
          <div className="h-3 w-24 bg-slate-100 rounded" />
        </div>
        <div className="h-10 w-10 rounded-xl bg-slate-100" />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: fetchStats,
    staleTime: 60_000,
  })

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Platform Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">FlowSentinel Admin Dashboard</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
          <Activity className="h-3.5 w-3.5 text-green-500" />
          Live
        </div>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard
              icon={Building2}
              label="Total Tenants"
              value={stats?.totalTenants}
              sub={`${stats?.activeTenants} active · ${stats?.suspendedTenants} suspended`}
              iconBg="bg-indigo-100"
              iconColor="text-indigo-600"
            />
            <StatCard
              icon={Key}
              label="Licenses"
              value={stats?.activeLicenses}
              sub={
                stats?.expiringLicenses > 0
                  ? `⚠️ ${stats.expiringLicenses} expiring within 30 days`
                  : `of ${stats?.totalLicenses} total`
              }
              iconBg="bg-violet-100"
              iconColor="text-violet-600"
            />
            <StatCard
              icon={Ticket}
              label="Open Tickets"
              value={stats?.openTickets}
              sub={stats?.openTickets === 0 ? 'All resolved' : 'Awaiting response'}
              iconBg={stats?.openTickets > 0 ? 'bg-amber-100' : 'bg-green-100'}
              iconColor={stats?.openTickets > 0 ? 'text-amber-600' : 'text-green-600'}
            />
            <StatCard
              icon={ShieldAlert}
              label="Tamper Alerts"
              value={stats?.unacknowledgedTamper}
              sub={stats?.unacknowledgedTamper === 0 ? 'Nothing to review' : 'Unacknowledged'}
              iconBg={stats?.unacknowledgedTamper > 0 ? 'bg-red-100' : 'bg-slate-100'}
              iconColor={stats?.unacknowledgedTamper > 0 ? 'text-red-600' : 'text-slate-500'}
              highlight={stats?.unacknowledgedTamper > 0}
            />
          </div>

          {/* Quick summary row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Tenant health */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-700">Tenant Health</h2>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: 'Active',      value: stats?.activeTenants,    color: 'bg-green-500' },
                  { label: 'Suspended',   value: stats?.suspendedTenants, color: 'bg-red-400' },
                  { label: 'Other',       value: Math.max(0, (stats?.totalTenants ?? 0) - (stats?.activeTenants ?? 0) - (stats?.suspendedTenants ?? 0)), color: 'bg-slate-300' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${color}`} />
                      <span className="text-slate-600">{label}</span>
                    </div>
                    <span className="font-semibold text-slate-900">{value ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* License status */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Key className="h-4 w-4 text-violet-500" />
                <h2 className="text-sm font-semibold text-slate-700">License Status</h2>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: 'Activated',   value: stats?.activeLicenses,                                                                              color: 'bg-indigo-500' },
                  { label: 'Expiring (30d)', value: stats?.expiringLicenses,                                                                         color: 'bg-amber-400' },
                  { label: 'Other',       value: Math.max(0, (stats?.totalLicenses ?? 0) - (stats?.activeLicenses ?? 0)), color: 'bg-slate-300' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${color}`} />
                      <span className="text-slate-600">{label}</span>
                    </div>
                    <span className="font-semibold text-slate-900">{value ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action required */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                <h2 className="text-sm font-semibold text-slate-700">Action Required</h2>
              </div>
              <div className="space-y-3">
                {stats?.unacknowledgedTamper > 0 && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    {stats.unacknowledgedTamper} tamper event{stats.unacknowledgedTamper !== 1 ? 's' : ''} need review
                  </div>
                )}
                {stats?.expiringLicenses > 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                    <Key className="h-4 w-4 shrink-0" />
                    {stats.expiringLicenses} license{stats.expiringLicenses !== 1 ? 's' : ''} expiring soon
                  </div>
                )}
                {stats?.openTickets > 0 && (
                  <div className="flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
                    <Ticket className="h-4 w-4 shrink-0" />
                    {stats.openTickets} support ticket{stats.openTickets !== 1 ? 's' : ''} open
                  </div>
                )}
                {stats?.unacknowledgedTamper === 0 && stats?.expiringLicenses === 0 && stats?.openTickets === 0 && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
                    <span className="text-base">✓</span>
                    All clear — nothing needs attention
                  </div>
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  )
}
