import { useEffect, useState, type FormEvent } from 'react'

export type AuthUser = { id: string; email: string }

interface Props {
  children: (user: AuthUser, signOut: () => Promise<void>) => React.ReactNode
}

type Mode = 'login' | 'signup'

export default function AuthGate({ children }: Props) {
  const [user, setUser] = useState<AuthUser | null | 'loading'>('loading')
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { user: AuthUser | null }) => setUser(d.user))
      .catch(() => setUser(null))
  }, [])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      const data = (await res.json().catch(() => ({}))) as { user?: AuthUser; error?: string }
      if (!res.ok) {
        setError(data.error || `${mode} failed (${res.status})`)
        return
      }
      if (data.user) {
        setUser(data.user)
        setEmail('')
        setPassword('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `${mode} failed`)
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
  }

  if (user === 'loading') {
    return (
      <main className="auth-loading">
        <p>…</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="auth">
        <header>
          <h1>Iris</h1>
          <p className="subtitle">Bilingual voice chat — German & English</p>
        </header>
        <form className="auth-form" onSubmit={onSubmit}>
          <h2>{mode === 'login' ? 'Sign in' : 'Create an account'}</h2>
          <label>
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" disabled={busy} className="auth-submit">
            {busy ? '…' : mode === 'login' ? 'Sign in' : 'Sign up'}
          </button>
          <button
            type="button"
            className="auth-toggle"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError(null)
            }}
            disabled={busy}
          >
            {mode === 'login' ? "No account? Sign up" : 'Have an account? Sign in'}
          </button>
        </form>
      </main>
    )
  }

  return <>{children(user, signOut)}</>
}
