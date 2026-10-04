import { Redis } from '@upstash/redis'

// Upstash Redis. Supports both the Vercel KV integration names and the
// native Upstash integration names. Server-side only — never NEXT_PUBLIC.
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN

export const redis =
  url && token
    ? new Redis({
        url,
        token,
        // One fast retry: a transient blip should not turn into a 5xx for the user.
        retry: { retries: 1, backoff: () => 50 },
      })
    : null
