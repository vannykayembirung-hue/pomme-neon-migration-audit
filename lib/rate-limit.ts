import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '@/lib/redis'

type Window = `${number} ${'s' | 'm' | 'h'}`
type Options = {
  limit: number
  window: Window
  /** Deny when Redis is unreachable. Use for endpoints that send email or guard credentials. */
  strict?: boolean
}

export type RateLimitResult = {
  allowed: boolean
  /** Seconds until the caller may retry (for the Retry-After header). */
  retryAfter: number
  /** True when the limiter backend was unreachable and the fallback policy decided. */
  degraded: boolean
}

const limiters = new Map<string, Ratelimit>()

const UNITS: Record<string, number> = { s: 1, m: 60, h: 3600 }
export function windowSeconds(window: Window): number {
  const [n, unit] = window.split(' ')
  return Number(n) * (UNITS[unit] ?? 60)
}

function limiterFor(name: string, { limit, window }: Options) {
  if (!redis) return null
  let l = limiters.get(name)
  if (!l) {
    l = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, window), prefix: `pomme:rl:${name}`, analytics: false })
    limiters.set(name, l)
  }
  return l
}

export function clientIp(request: Request) {
  // Vercel sets x-forwarded-for to the real client address and overwrites any client-supplied value.
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}

export async function rateLimit(name: string, key: string, options: Options): Promise<RateLimitResult> {
  const limiter = limiterFor(name, options)
  if (!limiter) {
    // Redis not configured. In production, strict endpoints fail closed; everything else
    // fails open so a missing integration never takes the whole app down.
    if (options.strict && process.env.NODE_ENV === 'production') {
      return { allowed: false, retryAfter: windowSeconds(options.window), degraded: true }
    }
    return { allowed: true, retryAfter: 0, degraded: false }
  }
  try {
    const { success, reset } = await limiter.limit(key)
    const retryAfter = success ? 0 : Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    return { allowed: success, retryAfter, degraded: false }
  } catch (error) {
    console.error(`[rate-limit] ${name} backend error`, error)
    // Safe fallback for a temporary Redis outage: strict endpoints (email senders, admin
    // auth) deny with a Retry-After; the rest allow so the app keeps working.
    if (options.strict) return { allowed: false, retryAfter: windowSeconds(options.window), degraded: true }
    return { allowed: true, retryAfter: 0, degraded: true }
  }
}

/** Standard 429 response with Retry-After (seconds), per RFC 6585. */
export function tooManyRequests(result: RateLimitResult, body?: Record<string, unknown>): Response {
  const headers = new Headers({
    'retry-after': String(result.retryAfter || 60),
    'cache-control': 'no-store',
  })
  if (result.degraded) headers.set('x-ratelimit-degraded', '1')
  if (body) return Response.json(body, { status: 429, headers })
  return new Response(null, { status: 429, headers })
}
