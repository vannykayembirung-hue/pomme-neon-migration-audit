'use client'

/**
 * Phase 2.5 — minimal account panel: sign up, log in, log out, save the week.
 * Real calls to /api/auth/* and /api/plan. On login, the anonymous local week
 * and the cloud week are merged by the server (explicit strategy, never lost).
 */
import { useEffect, useState } from 'react'
import { STORAGE_KEY } from '@/lib/pomme/persist'

type Account = { email: string; savedAt: number | null }

export function AccountPanel() {
  const [account, setAccount] = useState<Account | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok) setAccount({ email: d.email, savedAt: d.savedAt ?? null })
      })
      .catch(() => {})
  }, [])

  const localPayload = () => {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  const finishAuth = (d: { ok: boolean; email: string; state: unknown; savedAt: number | null; error?: string }) => {
    if (!d.ok) {
      setMessage(d.error === 'invalid-credentials' ? 'Wrong email or password.' : `Could not continue: ${d.error ?? 'unknown'}`)
      return
    }
    if (d.state) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...d.state, savedAt: Date.now() }))
      } catch {
        /* storage blocked */
      }
    }
    setAccount({ email: d.email, savedAt: d.savedAt })
    setMessage('You are in. Your week follows your account.')
  }

  const submit = async (mode: 'login' | 'signup') => {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, local: localPayload() }),
      })
      finishAuth(await res.json())
    } catch {
      setMessage('Network hiccup — try again.')
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setAccount(null)
    setMessage('Logged out. This device keeps its own copy of the week.')
  }

  const saveNow = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch('/api/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: localPayload() }),
      })
      const d = await res.json()
      if (d.ok) {
        setAccount((a) => (a ? { ...a, savedAt: d.savedAt } : a))
        setMessage('Week saved to your account.')
      } else {
        setMessage('Could not save — log in first.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-3xl bg-oxblood p-7 text-cream">
      <p className="font-script text-4xl leading-none text-leaf">your account</p>
      <h3 className="mt-1 text-2xl font-black tracking-tight">
        {account ? account.email : 'keep your week anywhere'}
      </h3>

      {account ? (
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={saveNow}
            disabled={busy}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-cream px-6 font-bold text-oxblood transition hover:brightness-105 disabled:opacity-60"
          >
            {busy ? 'One second…' : 'Save this week to my account'}
          </button>
          <button
            type="button"
            onClick={logout}
            disabled={busy}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-cream/40 px-6 font-bold text-cream transition hover:bg-cream/10 disabled:opacity-60"
          >
            Log out
          </button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-12 rounded-2xl bg-cream/10 px-4 text-cream placeholder:text-cream/50 outline-none ring-cream/30 focus:ring-2"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (8+ characters)"
            className="h-12 rounded-2xl bg-cream/10 px-4 text-cream placeholder:text-cream/50 outline-none ring-cream/30 focus:ring-2"
          />
          <button
            type="button"
            onClick={() => submit('signup')}
            disabled={busy}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-cream px-6 font-bold text-oxblood transition hover:brightness-105 disabled:opacity-60"
          >
            {busy ? 'One second…' : 'Sign up'}
          </button>
          <button
            type="button"
            onClick={() => submit('login')}
            disabled={busy}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-cream/40 px-6 font-bold text-cream transition hover:bg-cream/10 disabled:opacity-60"
          >
            Log in
          </button>
        </div>
      )}

      {message && <p className="mt-4 text-sm text-cream/80">{message}</p>}
    </div>
  )
}
