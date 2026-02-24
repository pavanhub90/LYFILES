// app/(auth)/register/page.tsx
'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Registration failed')
      setLoading(false)
      return
    }

    // Auto sign-in after registration
    await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    })
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg grid-bg">
      <div className="w-full max-w-md bg-surface border border-white/12 rounded-2xl p-10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan to-violet rounded-xl flex items-center justify-center text-2xl mx-auto mb-3">🗂</div>
          <h1 className="font-display text-2xl font-bold">Create your account</h1>
          <p className="text-text-dim text-sm mt-1">Free forever · No credit card required</p>
        </div>

        <button onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-bg2 border border-white/12 text-sm font-medium hover:bg-surface2 transition-all mb-5">
          <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Sign up with Google
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-white/7"/>
          <span className="text-xs text-text-muted">or</span>
          <div className="flex-1 h-px bg-white/7"/>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3 mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-text-dim mb-2">Full name</label>
            <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Jane Doe"
              className="w-full px-4 py-3 rounded-xl bg-bg2 border border-white/12 text-sm text-text placeholder-text-muted focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 transition-all"/>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-dim mb-2">Email</label>
            <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl bg-bg2 border border-white/12 text-sm text-text placeholder-text-muted focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 transition-all"/>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-dim mb-2">Password</label>
            <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Min. 8 characters"
              className="w-full px-4 py-3 rounded-xl bg-bg2 border border-white/12 text-sm text-text placeholder-text-muted focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 transition-all"/>
          </div>

          <p className="text-xs text-text-muted leading-relaxed">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="text-cyan hover:underline">Terms</Link> and{' '}
            <Link href="/privacy" className="text-cyan hover:underline">Privacy Policy</Link>.
          </p>

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan to-[#00b5a0] text-bg font-bold text-sm hover:opacity-90 disabled:opacity-60 transition-all">
            {loading ? 'Creating account...' : 'Create free account'}
          </button>
        </form>

        <p className="text-center text-sm text-text-dim mt-6">
          Have an account? <Link href="/login" className="text-cyan hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
