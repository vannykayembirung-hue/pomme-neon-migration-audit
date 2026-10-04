export type ConsentCategory = 'analytics' | 'marketing'
export type ConsentState = { v: 1; analytics: boolean; marketing: boolean; at: number }

export const CONSENT_COOKIE = 'pomme_consent'
export const CONSENT_EVENT = 'pomme:consent'

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

export function getConsent(): ConsentState | null {
  const raw = readCookie(CONSENT_COOKIE)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ConsentState
    return parsed.v === 1 ? parsed : null
  } catch {
    return null
  }
}

export function hasConsent(category: ConsentCategory): boolean {
  return getConsent()?.[category] === true
}

// This cookie is a first-party preference record (strictly necessary), so it must be readable by JS: not httpOnly.
const ANALYTICS_COOKIES = /^(_ga|_gid|_gat|__utm)/
const MARKETING_COOKIES = /^(_gcl|_fbp|_fbc|_ttp|_tt_|ttclid|_dc_gtm)/

function expireCookie(name: string) {
  const parts = location.hostname.split('.')
  const domains = [undefined, ...parts.slice(0, -1).map((_, i) => parts.slice(i).join('.')).filter((d) => d.includes('.'))]
  for (const domain of domains) {
    document.cookie = `${name}=; Max-Age=0; Path=/${domain ? `; Domain=${domain}` : ''}`
  }
}

/** Switches vendor SDKs off, deletes their cookies, then reloads so no third-party code stays in memory. */
function revokeTracking(analytics: boolean, marketing: boolean) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID
  if (analytics && gaId) (window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] = true
  window.gtag?.('consent', 'update', {
    ...(analytics ? { analytics_storage: 'denied' } : {}),
    ...(marketing ? { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' } : {}),
  })
  if (marketing) {
    window.fbq?.('consent', 'revoke')
    ;(window as unknown as { ttq?: { disableCookie?: () => void } }).ttq?.disableCookie?.()
  }
  for (const entry of document.cookie.split('; ')) {
    const name = entry.split('=')[0]
    if ((analytics && ANALYTICS_COOKIES.test(name)) || (marketing && MARKETING_COOKIES.test(name))) expireCookie(name)
  }
  window.setTimeout(() => window.location.reload(), 200)
}

export function setConsent(choice: { analytics: boolean; marketing: boolean }) {
  const previous = getConsent()
  const revokedAnalytics = previous?.analytics === true && !choice.analytics
  const revokedMarketing = previous?.marketing === true && !choice.marketing
  const state: ConsentState = { v: 1, ...choice, at: Date.now() }
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(state))}; Max-Age=${60 * 60 * 24 * 180}; Path=/; SameSite=Strict${secure}`
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }))
  void fetch('/api/consent', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(choice),
    keepalive: true,
  }).catch(() => {})
  if (revokedAnalytics || revokedMarketing) revokeTracking(revokedAnalytics, revokedMarketing)
}

export function clearConsent() {
  const previous = getConsent()
  document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/`
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }))
  if (previous?.analytics || previous?.marketing) revokeTracking(previous.analytics, previous.marketing)
}

export function subscribeConsent(cb: () => void) {
  window.addEventListener(CONSENT_EVENT, cb)
  return () => window.removeEventListener(CONSENT_EVENT, cb)
}

// Cached raw cookie string keeps useSyncExternalStore snapshots stable.
export function consentSnapshot(): string {
  return readCookie(CONSENT_COOKIE) ?? ''
}
