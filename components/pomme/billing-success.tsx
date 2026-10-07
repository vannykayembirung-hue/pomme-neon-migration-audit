'use client'

/**
 * Phase 2.9 — return page from the SasPay hosted checkout.
 * Reconciles pending orders server-side. Works even if the return URL
 * carries no order id (SasPay makes no promise about redirect params).
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export function BillingSuccess() {
  const params = useSearchParams()
  const orderId = params.get('order') ?? params.get('session') ?? ''
  const [state, setState] = useState<'checking' | 'paid' | 'pending' | 'error'>('checking')
  const [plusUntil, setPlusUntil] = useState<string | null>(null)

  useEffect(() => {
    const qs = orderId ? `?id=${encodeURIComponent(orderId)}` : ''
    fetch(`/api/billing/checkout-status${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.paid) {
          setPlusUntil(d.plusUntil)
          setState('paid')
        } else if (d?.ok) setState('pending')
        else setState('error')
      })
      .catch(() => setState('error'))
  }, [orderId])

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-cream px-5 text-oxblood">
      {state === 'checking' && <p className="text-lg">Checking your payment…</p>}
      {state === 'paid' && (
        <>
          <p className="font-script text-4xl leading-none text-leaf">welcome to plus</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">You&apos;re in. Pomme Plus is on.</h1>
          <p className="mt-3 text-lg">
            {plusUntil ? `Your access runs until ${new Date(plusUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.` : 'Your access is active.'}
          </p>
        </>
      )}
      {state === 'pending' && (
        <>
          <h1 className="text-3xl font-black tracking-tight">Payment being confirmed.</h1>
          <p className="mt-3 text-lg">We have not seen the confirmation yet. It usually takes a few seconds — refresh this page in a moment.</p>
        </>
      )}
      {state === 'error' && (
        <>
          <h1 className="text-3xl font-black tracking-tight">Something did not connect.</h1>
          <p className="mt-3 text-lg">If you paid, your access will be granted automatically — email us and we will sort it in a minute.</p>
        </>
      )}
      <Link href="/" className="mt-8 font-bold underline underline-offset-4">
        Back to Pomme
      </Link>
    </main>
  )
}
