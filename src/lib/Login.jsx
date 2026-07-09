import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <div className="min-h-screen bg-steel-950 flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-steel-900 border border-steel-800 rounded-lg p-6">
        <h1 className="font-display text-3xl font-semibold text-steel-50 mb-1">CUBIT <span className="text-signal">FLOW</span></h1>
        <p className="text-steel-400 text-sm mb-6">Sign in with the account your admin set up.</p>
        <label className="block text-sm text-steel-300 mb-1">Email</label>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)} required
          className="w-full mb-4 px-3 py-2 rounded bg-steel-800 border border-steel-700 text-steel-50 focus:border-signal outline-none"
        />
        <label className="block text-sm text-steel-300 mb-1">Password</label>
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)} required
          className="w-full mb-4 px-3 py-2 rounded bg-steel-800 border border-steel-700 text-steel-50 focus:border-signal outline-none"
        />
        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
        <button
          type="submit" disabled={busy}
          className="w-full py-2.5 rounded bg-signal text-white font-medium disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
