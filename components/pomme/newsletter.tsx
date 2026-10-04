'use client'

import { useState } from 'react'
import { track } from '@/lib/telemetry'
import { usePomme } from './pomme-provider'

export function Newsletter() {
  const { locale } = usePomme()
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = String(new FormData(e.currentTarget).get('email') ?? '')
    setStatus('sending')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      })
      setStatus(res.ok ? 'sent' : 'error')
      if (res.ok) track({ type: 'newsletter_submit', locale })
    } catch {
      setStatus('error')
    }
  }

  return (
    <section aria-labelledby="newsletter-title" className="bg-cream py-16 text-oxblood">
      <div className="mx-auto max-w-xl px-5">
        <h2 id="newsletter-title" className="text-3xl font-black lowercase tracking-tight">
          one quiet email, sunday morning.
        </h2>
        <p className="mt-3 text-pretty">
          A plan for the week ahead, nothing else. We&apos;ll email you a link to confirm first, and you can leave with
          one click.
        </p>
        {status === 'sent' ? (
          <p role="status" className="mt-6 rounded-2xl bg-leaf-deep px-4 py-3 text-cream">
            Check your inbox. We&apos;ve sent a link to confirm.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="h-12 min-w-0 flex-1 rounded-xl border border-oxblood/30 bg-white px-4"
            />
            <button
              disabled={status === 'sending'}
              className="h-12 rounded-xl bg-oxblood px-6 font-bold text-cream hover:brightness-125 disabled:opacity-60"
            >
              Send me Sunday
            </button>
          </form>
        )}
        {status === 'error' && (
          <p role="alert" className="mt-2 text-sm font-bold">
            That didn&apos;t go through. Check the address and try again in a moment.
          </p>
        )}
        <p className="mt-3 text-xs text-oxblood/75">
          We use your email only to send this newsletter. See our{' '}
          <a href="/privacy" className="underline">
            privacy notice
          </a>
          .
        </p>
      </div>
    </section>
  )
}
