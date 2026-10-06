'use client'

/**
 * Phase 2.8 — first-party visit beacon. Fires only with analytics consent
 * (track() gates on hasConsent). Stores no identifier: "new" vs "returning"
 * is computed in the browser and only the label reaches the server.
 * Retries when the visitor grants consent (the banner usually answered after load).
 */
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { track } from '@/lib/telemetry'
import { CONSENT_EVENT, hasConsent } from '@/lib/consent'

const seenPages = new Set<string>()

export function TelemetryBeacon() {
  const pathname = usePathname()
  useEffect(() => {
    const locale = pathname?.startsWith('/uk') ? 'uk' : 'us'
    const fire = () => {
      if (!hasConsent('analytics')) return // re-runs when the visitor accepts via CONSENT_EVENT
      const path = pathname ?? '/'
      if (!seenPages.has(path)) {
        seenPages.add(path)
        track({ type: 'page_view', locale, reason: path })
      }
      try {
        if (!window.sessionStorage.getItem('pomme_visit')) {
          window.sessionStorage.setItem('pomme_visit', '1')
          const returning = !!window.localStorage.getItem('pomme_seen')
          window.localStorage.setItem('pomme_seen', '1')
          track({ type: 'visit', locale, reason: returning ? 'returning' : 'new' })
        }
      } catch {
        /* storage blocked — no visit event */
      }
    }
    fire()
    window.addEventListener(CONSENT_EVENT, fire)
    return () => window.removeEventListener(CONSENT_EVENT, fire)
  }, [pathname])
  return null
}
