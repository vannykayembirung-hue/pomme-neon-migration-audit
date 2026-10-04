import assert from 'node:assert/strict'
import { test } from 'node:test'
import { rateLimit, tooManyRequests, windowSeconds } from '../lib/rate-limit.ts'

// These tests run without UPSTASH_REDIS_REST_* / KV_* configured, which exercises
// the fallback paths exactly as a Redis outage would.

test('windowSeconds parses s/m/h windows', () => {
  assert.equal(windowSeconds('30 s'), 30)
  assert.equal(windowSeconds('10 m'), 600)
  assert.equal(windowSeconds('1 h'), 3600)
})

test('non-strict endpoints fail open when Redis is not configured', async () => {
  const result = await rateLimit('events', '1.2.3.4', { limit: 60, window: '1 m' })
  assert.equal(result.allowed, true)
})

test('strict endpoints deny in production when Redis is not configured', async () => {
  const previous = process.env.NODE_ENV
  Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true, writable: true, enumerable: true })
  try {
    const result = await rateLimit('admin-login', '1.2.3.4', { limit: 8, window: '15 m', strict: true })
    assert.equal(result.allowed, false)
    assert.equal(result.retryAfter, 900)
    assert.equal(result.degraded, true)
  } finally {
    Object.defineProperty(process.env, 'NODE_ENV', { value: previous, configurable: true, writable: true, enumerable: true })
  }
})

test('429 responses carry a Retry-After header', async () => {
  const res = tooManyRequests({ allowed: false, retryAfter: 42, degraded: false })
  assert.equal(res.status, 429)
  assert.equal(res.headers.get('retry-after'), '42')

  const json = tooManyRequests({ allowed: false, retryAfter: 7, degraded: true }, { ok: false })
  assert.equal(json.status, 429)
  assert.equal(json.headers.get('retry-after'), '7')
  assert.equal(json.headers.get('x-ratelimit-degraded'), '1')
})
