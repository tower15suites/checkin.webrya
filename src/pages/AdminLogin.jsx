import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../hooks/useAdminAuth.jsx'

export default function AdminLogin() {
  const { login } = useAdminAuth()
  const navigate = useNavigate()
  const [creds, setCreds] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(creds.email, creds.password)
      navigate('/admin')
    } catch (err) {
      setError('Λάθος email ή password. Δοκιμάστε ξανά.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh bg-stone-950 flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-xs animate-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <img src="/logo-tower15suites.png" alt="Tower 15 Suites" className="h-16 w-auto mx-auto mb-2" />
          <h1 className="font-display text-3xl font-light text-white">Admin Panel</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              className="input-field"
              type="email"
              autoComplete="email"
              placeholder="info@webrya.com"
              value={creds.email}
              onChange={e => setCreds(c => ({ ...c, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input-field"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••"
              value={creds.password}
              onChange={e => setCreds(c => ({ ...c, password: e.target.value }))}
            />
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Σύνδεση...' : 'Είσοδος →'}
          </button>
        </form>
      </div>
    </div>
  )
}