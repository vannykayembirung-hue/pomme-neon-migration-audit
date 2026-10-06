import { hasConsent } from './consent'

export type TelemetryEvent =
  | { type: 'plan_generated'; locale: string; mood?: string }
  | { type: 'paywall_open'; locale: string; reason: string }
  | { type: 'share'; locale: string; channel: string }
  | { type: 'newsletter_submit'; locale: string }
  | { type: 'swap'; locale: string; reason: string }
  | { type: 'visit'; locale: string; reason?: string }
  | { type: 'page_view'; locale: string; reason?: string }
  | { type: 'signup'; locale: string }
  | { type: 'login'; locale: string }
  | { type: 'plan_saved'; locale: string }

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
    ttq?: { track: (name: string, data?: unknown) => void }
  }
}

/** Fires only with analytics consent. No anonymous ID and no IP are stored. */
export function track(event: TelemetryEvent) {
  if (typeof window === 'undefined' || !hasConsent('analytics')) return
  void fetch('/api/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => {})
  window.gtag?.('event', event.type, { ...event })
}
