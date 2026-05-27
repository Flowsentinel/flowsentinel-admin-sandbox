import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/Badge'

const statusVariant = { ACTIVE: 'success', REVOKED: 'danger', EXPIRED: 'warning' }

async function fetchLicenses() {
  const { data, error } = await supabase
    .from('licenses')
    .select('id, status, max_mailboxes, expires_at, created_at, tenant_id, tenants(company_name, company_code)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export default function Licenses() {
  const navigate = useNavigate()
  const { data: licenses = [], isLoading } = useQuery({ queryKey: ['licenses'], queryFn: fetchLicenses })

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Licenses</h1>
        <p className="text-sm text-slate-500 mt-0.5">{licenses.length} total</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : licenses.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No licenses found</div>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tenant</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Mailboxes</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Expires</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {licenses.map(lic => (
                <tr
                  key={lic.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate(`/tenants/${lic.tenant_id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{lic.tenants?.company_name}</p>
                    <p className="text-xs text-slate-400 font-mono">{lic.tenants?.company_code}</p>
                  </td>
                  <td className="px-4 py-3"><Badge variant={statusVariant[lic.status] ?? 'default'}>{lic.status}</Badge></td>
                  <td className="px-4 py-3 text-slate-600">{lic.max_mailboxes}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(lic.expires_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-400">{new Date(lic.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
