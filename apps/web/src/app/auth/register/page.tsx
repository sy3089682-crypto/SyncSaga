'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '', username: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.username.length < 3) { setError('Username must be at least 3 characters'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { username: form.username } },
    })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-2">SyncSaga</h1>
          <p className="text-[#666] text-sm">Join the watch party.</p>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] p-8">
          <h2 className="text-xl font-bold text-white mb-6">Create Account</h2>
          <form onSubmit={handleRegister} className="space-y-4">
            {error && <div className="bg-red-950/50 border border-red-800 text-red-400 text-sm p-3">{error}</div>}
            <div>
              <label className="block text-xs text-[#666] mb-2 uppercase tracking-wider">Username</label>
              <input
                type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white px-4 py-3 focus:outline-none focus:border-[#00d4ff] transition-colors"
                minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+" required
              />
            </div>
            <div>
              <label className="block text-xs text-[#666] mb-2 uppercase tracking-wider">Email</label>
              <input
                type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white px-4 py-3 focus:outline-none focus:border-[#00d4ff] transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-[#666] mb-2 uppercase tracking-wider">Password</label>
              <input
                type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white px-4 py-3 focus:outline-none focus:border-[#00d4ff] transition-colors"
                minLength={8} required
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-[#00d4ff] hover:bg-[#00b8d9] disabled:opacity-50 text-black font-bold py-3 transition-colors"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-[#444] text-sm mt-6">
            Already have an account? <Link href="/auth/login" className="text-[#00d4ff] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
