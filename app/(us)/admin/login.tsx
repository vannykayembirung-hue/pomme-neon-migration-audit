'use client'

import { useState } from 'react'

export function AdminLogin({ configured }: { configured: boolean }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const passphrase = String(new FormData(e.currentTarget).get('passphrase') ?? '')
    const res = await fetch('/admin/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    })
    if (res.ok) location.reload()
    else {
      setError('That did not work.')
      setBusy(false)
    }
  }

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-cream px-5 text-oxblood">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-sm ring-1 ring-oxblood/10">
        <h1 className="text-2xl font-black">Pomme admin</h1>
        {!configured && <p className="mt-2 text-sm">ADMIN_TOKEN is not set, so nobody can sign in.</p>}
        <label htmlFor="passphrase" className="mt-5 block text-sm font-bold">
          Passphrase
        </label>
        <input
          id="passphrase"
          name="passphrase"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-xl border border-oxblood/30 px-3 py-2.5"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm font-bold">
            {error}
          </p>
        )}
        <button disabled={busy} className="mt-4 w-full rounded-xl bg-oxblood py-3 font-bold text-cream disabled:opacity-60">
          Sign in
        </button>
      </form>
    </main>
  )
}
