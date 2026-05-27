import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

async function fetchAdminProfile(userId) {
  const { data } = await supabase
    .from('admin_users')
    .select('id, full_name, role, is_active')
    .eq('auth_user_id', userId)
    .single()
  if (!data?.is_active) return null
  return { id: data.id, fullName: data.full_name, role: data.role }
}

export default function Login() {
  const navigate = useNavigate()
  const { setSession } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (authError) {
        setError('Invalid email or password.')
        return
      }

      const profile = await fetchAdminProfile(data.session.user.id)
      if (!profile) {
        await supabase.auth.signOut()
        setError('Access denied. Your account is inactive or not an admin.')
        return
      }

      setSession(data.session, profile)
      navigate('/dashboard', { replace: true })
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f0eeff' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <img src="/logo_login.svg" alt="FlowSentinel" className="h-20" />
          <span className="mt-2 text-xs font-semibold tracking-widest uppercase text-indigo-500 bg-indigo-50 px-3 py-0.5 rounded-full">
            Admin Portal
          </span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-7">
          <p className="text-center text-slate-500 text-sm mb-6">
            Sign in to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-800">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-800">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-violet-600 hover:text-violet-700 transition-colors"
              >
                Forgot your password?
              </Link>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
