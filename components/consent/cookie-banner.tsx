'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { consentSnapshot, getConsent, setConsent, subscribeConsent } from '@/lib/consent'

export const OPEN_CONSENT_EVENT = 'pomme:open-consent'

export function CookieBanner() {
  const raw = useSyncExternalStore(subscribeConsent, consentSnapshot, () => 'pending')
  const [reopened, setReopened] = useState(false)
  const [customising, setCustomising] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    const open = () => {
      const current = getConsent()
      setAnalytics(current?.analytics ?? false)
      setMarketing(current?.marketing ?? false)
      setCustomising(true)
      setReopened(true)
    }
    window.addEventListener(OPEN_CONSENT_EVENT, open)
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, open)
  }, [])

  const visible = raw === '' || reopened
  if (!visible || raw === 'pending') return null

  const choose = (choice: { analytics: boolean; marketing: boolean }) => {
    setConsent(choice)
    setReopened(false)
    setCustomising(false)
  }

  return (
    <section
      aria-label="Cookie preferences"
      className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-xl rounded-3xl bg-cream p-5 text-oxblood shadow-2xl ring-1 ring-oxblood/15"
    >
      <h2 className="text-base font-black">A quick word about cookies</h2>
      <p className="mt-1 text-sm leading-relaxed">
        Pomme works without any tracking. With your say-so, we&apos;d like to count visits and measure our ads. Nothing
        optional is switched on until you choose.
      </p>
      {customising && (
        <div className="mt-4 flex flex-col gap-3 text-sm">
          <label className="flex items-start gap-3">
            <input type="checkbox" checked disabled className="mt-1 size-4 accent-apple" />
            <span>
              <strong>Essential.</strong> Remembers your plan and this choice. Always on.
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              className="mt-1 size-4 accent-apple"
            />
            <span>
              <strong>Analytics.</strong> Anonymous counts of visits and plans made, to help us improve.
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="mt-1 size-4 accent-apple"
            />
            <span>
              <strong>Marketing.</strong> Lets Meta and TikTok measure whether our ads work.
            </span>
          </label>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => choose({ analytics: true, marketing: true })}
          className="rounded-xl bg-oxblood px-4 py-2.5 text-sm font-bold text-cream hover:brightness-125"
        >
          Accept all
        </button>
        <button
          type="button"
          onClick={() => choose({ analytics: false, marketing: false })}
          className="rounded-xl bg-oxblood px-4 py-2.5 text-sm font-bold text-cream hover:brightness-125"
        >
          Reject all
        </button>
        {customising ? (
          <button
            type="button"
            onClick={() => choose({ analytics, marketing })}
            className="rounded-xl border-2 border-oxblood px-4 py-2 text-sm font-bold hover:bg-oxblood/5"
          >
            Save my choices
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCustomising(true)}
            className="rounded-xl border-2 border-oxblood px-4 py-2 text-sm font-bold hover:bg-oxblood/5"
          >
            Customise
          </button>
        )}
      </div>
    </section>
  )
}
