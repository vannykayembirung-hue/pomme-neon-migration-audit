'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PLUS_FEATURES, PRICES, annualSaving, priceLabel } from '@/lib/pomme/content'
import { usePomme, type PaywallReason } from './pomme-provider'

const COPY: Record<PaywallReason, { title: string; body: string }> = {
  swap: {
    title: 'Swaps are a Plus thing.',
    body: 'Not feeling Thursday? Swap it in a tap. Your free plan swaps once a week — Pomme Plus lifts the limit.',
  },
  save: {
    title: 'Keep this week. And the next.',
    body: 'This week is already saved on your device. Pomme Plus will keep every week you love, on every device.',
  },
  budget: {
    title: 'Let budget mode do the maths.',
    body: 'Pomme finds cheaper swaps and shared ingredients until the basket fits your number.',
  },
  'next-week': {
    title: 'Next Sunday, already sorted.',
    body: 'A fresh plan every Sunday at six, shaped by the week you gave her — ready before the shop.',
  },
  pricing: {
    title: 'Meet Pomme Plus.',
    body: 'Every Sunday, a plan that knows you a little better than the last.',
  },
}

export function Paywall() {
  const { paywall, closePaywall, locale } = usePomme()
  const ref = useRef<HTMLDialogElement>(null)
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual')
  const [checkout, setCheckout] = useState<'idle' | 'busy' | 'error'>('idle')
  const [checkoutHint, setCheckoutHint] = useState('')
  const [reason, setReason] = useState<PaywallReason>('pricing')

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (paywall) {
      setReason(paywall)
      setCheckout('idle')
      setCheckoutHint('')
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [paywall])

  const price = PRICES[locale]
  const copy = COPY[reason]
  const after =
    billing === 'annual' ? `${priceLabel(price.annual, locale)}/year` : `${priceLabel(price.monthly, locale)}/month`

  return (
    <dialog
      ref={ref}
      aria-labelledby="paywall-title"
      onClose={closePaywall}
      onClick={(e) => {
        if (e.target === e.currentTarget) closePaywall()
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-[2rem] bg-oxblood p-0 text-cream shadow-2xl backdrop:bg-oxblood/75 backdrop:backdrop-blur-sm"
    >
      <div className="relative overflow-hidden p-6 sm:p-7">
        <Image
          src="/images/hero-apple.webp"
          alt=""
          width={1024}
          height={1024}
          sizes="224px"
          className="pointer-events-none absolute -right-14 -top-14 w-56 opacity-90 [mask-image:radial-gradient(closest-side,black_60%,transparent)]"
        />
        <button
          type="button"
          onClick={closePaywall}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 inline-flex size-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        <div className="relative">
          <p className="font-script text-4xl leading-none text-leaf">pomme plus</p>
          <h2 id="paywall-title" className="mt-2 max-w-[15ch] text-3xl font-black leading-tight tracking-tight">
            {copy.title}
          </h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-cream/70">Preview pricing</p>
          <p className="mt-3 max-w-[34ch] text-cream/75">{copy.body}</p>
        </div>

        <ul className="relative mt-6 flex flex-col gap-2.5 text-sm">
          {PLUS_FEATURES.slice(0, 5).map((feature) => (
            <li key={feature} className="flex gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>

        <div role="radiogroup" aria-label="Billing" className="relative mt-6 grid grid-cols-2 gap-2">
          {(['annual', 'monthly'] as const).map((option) => {
            const active = billing === option
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setBilling(option)}
                className={cn(
                  'relative rounded-2xl p-3.5 text-left ring-1 transition',
                  active ? 'bg-cream text-oxblood ring-cream' : 'bg-white/[0.04] ring-white/15 hover:ring-white/30',
                )}
              >
                {option === 'annual' && (
                  <span className="absolute -top-2.5 right-3 rounded-full bg-apple px-2 py-0.5 text-[10px] font-bold text-cream">
                    Save {annualSaving(locale)}%
                  </span>
                )}
                <span className="block text-xs font-semibold opacity-70">
                  {option === 'annual' ? 'Yearly' : 'Monthly'}
                </span>
                <span className="mt-0.5 block text-lg font-black">
                  {option === 'annual' ? priceLabel(price.annual, locale) : priceLabel(price.monthly, locale)}
                </span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          disabled={checkout === 'busy'}
          onClick={async () => {
            setCheckout('busy')
            try {
              const res = await fetch('/api/billing/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: billing, locale }),
              })
              if (res.status === 401) {
                window.location.href = '/account'
                return
              }
              const d = await res.json().catch(() => null)
              if (d?.checkoutUrl) {
                window.location.href = d.checkoutUrl
                return
              }
              setCheckoutHint(d?.hint ?? '')
              setCheckout('error')
            } catch {
              setCheckoutHint('')
              setCheckout('error')
            }
          }}
          className="relative mt-6 inline-flex h-13 w-full items-center justify-center rounded-2xl bg-apple py-4 font-bold text-primary-foreground shadow-[0_14px_30px_-12px_rgba(214,42,51,0.8)] transition hover:brightness-110 disabled:opacity-70"
        >
          {checkout === 'busy' ? 'One second…' : `Get Pomme Plus — ${after}`}
        </button>
        {checkout === 'error' && (
          <p role="status" className="relative mt-3 rounded-2xl bg-cream/10 px-4 py-3 text-sm text-cream">
            {checkoutHint || 'The payment page did not open. Try again in a moment — nothing has been charged.'}
          </p>
        )}
        <p className="relative mt-3 text-center text-xs text-cream/55">
          New here? Your first week is free — create your account and the trial starts. Then {after}. One payment, no
          auto-renewal.
        </p>
        <button
          type="button"
          onClick={closePaywall}
          className="relative mt-2 w-full py-2 text-sm font-medium text-cream/60 transition hover:text-cream"
        >
          Not now, keep my free plan
        </button>
      </div>
    </dialog>
  )
}
