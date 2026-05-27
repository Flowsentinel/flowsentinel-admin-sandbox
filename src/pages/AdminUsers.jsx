import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, UserX, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { callAdminApi } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/stores/authStore'

async function fetchAdmins() {
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, full_name, role, is_active, created_at, auth_user_id')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export default function AdminUsers() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', role: 'ADMIN', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')

  const { data: admins = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: fetchAdmins })

  const createMutation = useMutation({
    mutationFn: (body) => callAdminApi('admin-create-admin', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setShowCreate(false)
      setForm({ email: '', full_name: '', role: 'ADMIN', password: '' })
      setFormError('')
    },
    onError: (e) => setFormError(e.message),
  })

  const deactivateMutation = useMutation({
    mutationFn: (adminId) => callAdminApi('admin-deactivate-admin', { admin_id: adminId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Admin Users</h1>
          <p className="text-sm text-slate-500 mt-0.5">Super Admin only</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700"
        >
          <Plus className="h-4 w-4" /> Add Admin
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map(admin => (
                <tr key={admin.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{admin.full_name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={admin.role === 'SUPER_ADMIN' ? 'purple' : 'default'}>{admin.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={admin.is_active ? 'success' : 'danger'}>
                      {admin.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{new Date(admin.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {admin.is_active && admin.id !== profile?.id && (
                      <button
                        onClick={() => deactivateMutation.mutate(admin.id)}
                        disabled={deactivateMutation.isPending}
                        className="flex items-center gap-1 text-xs text-red-600 hover:underline"
                      >
                        <UserX className="h-3.5 w-3.5" /> Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Admin User">
        <form onSubmit={e => { e.preventDefault(); setFormError(''); createMutation.mutate(form) }} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Full Name</label>
            <input
              required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <input
                required type={showPassword ? 'text' : 'password'}
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                minLength={12}
                placeholder="Min 12 characters"
                className="block w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400">New admin will use this to log in for the first time</p>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Role</label>
            <select
              value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ADMIN">Admin</option>
            </select>
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
