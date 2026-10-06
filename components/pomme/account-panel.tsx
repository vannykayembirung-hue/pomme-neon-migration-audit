'use client'

/**
 * Phase 2.5 → 2.8 — account panel. Auth calls unchanged (validated in 2.5/2.7).
 * UX decision (Phase 2.8): "your account" must feel like home for a non-technical
 * user — a warm greeting, HER week at a glance, and one obvious big button.
 * Never a dead end.
 */
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { STORAGE_KEY, parsePersisted } from '@/lib/pomme/persist'
import { track } from '@/lib/telemetry'
import { applySwaps, generatePlan, DAY_NAMES } from '@/lib/pomme/plan'
import { localName } from '@/lib/pomme/recipes'

type Account = { email: string; savedAt: number | null }

export function AccountPanel() {
  const [account, setAccount] = useState<Account | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)
  const pathname = usePathname()
  const locale = pathname?.startsWith('/uk') ? 'uk' : 'us'
  const weekHref = locale === 'uk' ? '/uk/#sunday-plan' : '/#sunday-plan'

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

  // Aperçu de SA semaine — pure engine, read-only, client-side only (account set after fetch).
  const weekPreview = useMemo(() => {
    if (!account || typeof window === 'undefined') return null
    try {
      const state = parsePersisted(window.localStorage.getItem(STORAGE_KEY))
      if (!state || state.seed <= 0) return null
      const prefs = state.planPrefs ?? state.prefs
      const plan = applySwaps(generatePlan(prefs, state.locale, state.seed, state.memory), state.swaps, prefs, state.locale)
      return plan.days.map((d) => ({
        key: d.day,
        label: DAY_NAMES[d.day].slice(0, 3),
        meal: d.kind === 'meal' ? localName(d.recipe.name, state.locale) : 'Night off',
      }))
    } catch {
      return null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.email, account?.savedAt, refresh])

  const finishAuth = (d: { ok: boolean; email: string; state: unknown; savedAt: number | null; error?: string }, mode: 'login' | 'signup') => {
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
    track({ type: mode === 'signup' ? 'signup' : 'login', locale })
    setMessage('You are in. Your week follows your account.')
    setRefresh((n) => n + 1)
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
      finishAuth(await res.json(), mode)
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
    setRefresh((n) => n + 1)
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
        track({ type: 'plan_saved', locale })
        setMessage('Week saved to your account.')
        setRefresh((n) => n + 1)
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
        {account ? 'Welcome back.' : 'keep your week anywhere'}
      </h3>
      {account && <p className="mt-1 text-sm text-cream/70">{account.email}</p>}

      {account ? (
        <>
          {/* SA semaine, d'un coup d'œil */}
          <div className="mt-6 rounded-2xl bg-cream/10 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-leaf">Your week</p>
            {weekPreview ? (
              <ul className="mt-2 space-y-1">
                {weekPreview.map((row) => (
                  <li key={row.key} className="flex items-baseline gap-3 text-sm">
                    <span className="w-10 shrink-0 font-bold uppercase tracking-wider text-cream/60">{row.label}</span>
                    <span className="truncate text-cream">{row.meal}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-cream/70">No week planned yet — it will appear here.</p>
            )}
            <p className="mt-3 text-xs text-cream/70">
              {account.savedAt
                ? `Saved to your account · ${new Date(account.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                : 'Not saved to your account yet — tap Save below.'}
            </p>
          </div>

          {/* LE bouton : une seule action évidente */}
          <div className="mt-6 flex flex-col gap-3">
            <a
              href={weekHref}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-cream px-6 text-base font-bold text-oxblood transition hover:brightness-105"
            >
              See my week
            </a>
            <button
              type="button"
              onClick={saveNow}
              disabled={busy}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-cream/40 px-6 font-bold text-cream transition hover:bg-cream/10 disabled:opacity-60"
            >
              {busy ? 'One second…' : 'Save this week to my account'}
            </button>
            <button
              type="button"
              onClick={logout}
              disabled={busy}
              className="mx-auto mt-1 text-sm text-cream/60 underline underline-offset-4 transition hover:text-cream"
            >
              Log out
            </button>
          </div>
        </>
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

      {message && (
        <p role="status" className="mt-4 rounded-xl bg-cream/10 px-3 py-2 text-sm text-cream/90">
          {message}
        </p>
      )}
    </div>
  )
}
