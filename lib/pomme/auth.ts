/**
 * Phase 2.5 — authentication primitives.
 * Pure, dependency-free (node:crypto): scrypt password hashes, HMAC session
 * tokens. Identity is ALWAYS derived from a verified session token — a userId
 * arriving in a request body is never trusted.
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

// ── passwords ────────────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 32).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const [, salt, hash] = parts
  const candidate = scryptSync(password, salt, 32)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

// ── sessions ─────────────────────────────────────────────────────────────────

const b64 = (s: string) => Buffer.from(s).toString('base64url')
const unb64 = (s: string) => Buffer.from(s, 'base64url').toString('utf8')

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

/** Token format: v1.<base64url(userId)>.<expiresAtMs>.<hmac>. */
export function createSessionToken(userId: string, secret: string, now = Date.now()): string {
  const expiresAt = now + SESSION_TTL_MS
  const payload = `v1.${b64(userId)}.${expiresAt}`
  return `${payload}.${sign(payload, secret)}`
}

export function verifySessionToken(token: string, secret: string, now = Date.now()): string | null {
  const parts = token.split('.')
  if (parts.length !== 4 || parts[0] !== 'v1') return null
  const [, uid, exp, sig] = parts
  const payload = `v1.${uid}.${exp}`
  const expected = sign(payload, secret)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  const expiresAt = Number(exp)
  if (!Number.isFinite(expiresAt) || expiresAt < now) return null
  const userId = unb64(uid)
  return userId.length > 0 ? userId : null
}
