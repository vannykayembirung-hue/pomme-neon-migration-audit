/**
 * Phase 2.5 — shared plumbing for the auth/plan API routes.
 * Fail-closed: without POMME_SESSION_SECRET the auth routes answer 503
 * instead of running with a guessable secret.
 */
import { SESSION_TTL_MS } from './auth'
import { parsePersisted } from './persist'
import type { StampedState } from './merge'

export const SESSION_COOKIE = 'pomme_session'

export function authSecret(): string | null {
  return process.env.POMME_SESSION_SECRET || null
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: Math.floor(SESSION_TTL_MS / 1000),
}

export const clearCookieOptions = { ...sessionCookieOptions, maxAge: 0 }

/** Validates an incoming localStorage-shaped payload via parsePersisted. */
export function stampedFromPayload(raw: unknown): StampedState | null {
  if (!raw || typeof raw !== 'object') return null
  const state = parsePersisted(JSON.stringify(raw))
  if (!state) return null
  const savedAt = (raw as { savedAt?: unknown }).savedAt
  return { state, savedAt: typeof savedAt === 'number' ? savedAt : Date.now() }
}

export function readSessionCookie(request: Request): string | null {
  const header = request.headers.get('cookie') ?? ''
  const match = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`))
  return match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : null
}
