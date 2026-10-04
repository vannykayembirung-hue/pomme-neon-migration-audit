'use client'

import { useState } from 'react'
import { getConsent, setConsent } from '@/lib/consent'

export function DoNotSellActions() {
  const [done, setDone] = useState(false)
  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => {
          const current = getConsent()
          setConsent({ analytics: current?.analytics ?? false, marketing: false })
          setDone(true)
        }}
        className="rounded-xl bg-oxblood px-5 py-3 font-bold text-cream hover:brightness-125"
      >
        Opt out of sale and sharing
      </button>
      {done && (
        <p role="status" className="mt-3 font-bold">
          Done. Marketing cookies are off for this browser.
        </p>
      )}
    </div>
  )
}
