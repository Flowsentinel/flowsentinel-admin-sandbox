import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function VerifyOtp() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''

  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: 'email',
      })

      if (verifyError) {
        setError('Invalid or expired code. Please check and try again.')
        return
      }

      navigate('/reset-password', {
        state: { email, session: data.session },
        replace: true,
      })
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!email) {
    return <Link to="/forgot-password" replace />
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
          <p className="text-center text-slate-500 text-sm mb-1">
            Enter verification code
          </p>
          <p className="text-center text-xs text-slate-400 mb-6">
            Sent to <strong className="text-slate-600">{email}</strong>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-800">
                Verification code
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={8}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                required
                className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono text-center tracking-[0.4em] text-slate-800 placeholder:text-slate-300 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify code'}
            </button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-2">
            <Link
              to="/forgot-password"
              className="text-sm text-violet-600 hover:text-violet-700 transition-colors"
            >
              Resend code
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Back to sign in
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
