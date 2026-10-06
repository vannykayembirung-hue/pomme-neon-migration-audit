'use client'

/**
 * Phase 2.8 — first-party visit beacon. Fires only with analytics consent
 * (track() gates on hasConsent). Stores no identifier: "new" vs "returning"
 * is computed in the browser and only the label reaches the server.
 */
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { track } from '@/lib/telemetry'

export function TelemetryBeacon() {
  const pathname = usePathname()
  useEffect(() => {
    const locale = pathname?.startsWith('/uk') ? 'uk' : 'us'
    track({ type: 'page_view', locale, reason: pathname ?? '/' })
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
  }, [pathname])
  return null
}
