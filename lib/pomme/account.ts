/**
 * Phase 2.5 — account service (signup / login / load / save).
 * The data source is injected (`AccountRepo`), so the exact code the API routes
 * run is unit-tested against an in-memory repo. Neon/Drizzle implements the
 * same interface in lib/db/user-repo.ts.
 *
 * Security rules enforced here:
 *  - identity comes ONLY from a verified session token, never from a body field;
 *  - every plan read/write is keyed by that session user — cross-user access is
 *    structurally impossible at this layer;
 *  - local + cloud data are merged by lib/pomme/merge.ts, never silently lost.
 */
import { createSessionToken, hashPassword, verifyPassword, verifySessionToken } from './auth'
import { mergeLocalAndCloud, type MergeResult, type StampedState } from './merge'

export type UserRecord = {
  id: string
  email: string
  passwordHash: string
  createdAt: number
}

export type AccountRepo = {
  findUserByEmail(email: string): Promise<UserRecord | null>
  findUserById(id: string): Promise<UserRecord | null>
  createUser(email: string, passwordHash: string): Promise<UserRecord>
  getPlan(userId: string): Promise<StampedState | null>
  savePlan(userId: string, plan: StampedState): Promise<void>
}

export type AuthSuccess = { ok: true; userId: string; token: string; merged: MergeResult | null }
export type AuthFailure = {
  ok: false
  error: 'invalid-credentials' | 'invalid-email' | 'weak-password' | 'email-taken'
}
export type AuthResult = AuthSuccess | AuthFailure

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function validEmail(email: string): boolean {
  return email.length >= 3 && email.length <= 254 && EMAIL_RE.test(email)
}

export async function signup(
  repo: AccountRepo,
  secret: string,
  email: string,
  password: string,
  local: StampedState | null,
  now = Date.now(),
): Promise<AuthResult> {
  const normalized = normalizeEmail(email)
  if (!validEmail(normalized)) return { ok: false, error: 'invalid-email' }
  if (typeof password !== 'string' || password.length < 8) return { ok: false, error: 'weak-password' }
  if (await repo.findUserByEmail(normalized)) return { ok: false, error: 'email-taken' }
  const user = await repo.createUser(normalized, hashPassword(password))
  // A brand-new account starts from the anonymous local week, if any.
  const cloud = (await repo.getPlan(user.id)) ?? null
  const merged = mergeLocalAndCloud(local, cloud)
  if (merged) await repo.savePlan(user.id, merged.merged)
  return { ok: true, userId: user.id, token: createSessionToken(user.id, secret, now), merged }
}

export async function login(
  repo: AccountRepo,
  secret: string,
  email: string,
  password: string,
  local: StampedState | null,
  now = Date.now(),
): Promise<AuthResult> {
  const normalized = normalizeEmail(email)
  const user = await repo.findUserByEmail(normalized)
  if (!user || !verifyPassword(String(password), user.passwordHash)) {
    return { ok: false, error: 'invalid-credentials' }
  }
  const cloud = await repo.getPlan(user.id)
  const merged = mergeLocalAndCloud(local, cloud)
  if (merged) await repo.savePlan(user.id, merged.merged)
  return { ok: true, userId: user.id, token: createSessionToken(user.id, secret, now), merged }
}

/** Identity is derived from the session token alone. */
export async function loadAccount(
  repo: AccountRepo,
  token: string,
  secret: string,
  now = Date.now(),
): Promise<{ userId: string; email: string; plan: StampedState | null } | null> {
  const userId = verifySessionToken(token, secret, now)
  if (!userId) return null
  const user = await repo.findUserById(userId)
  if (!user) return null
  const plan = await repo.getPlan(userId)
  return { userId, email: user.email, plan }
}

/** Saves under the session user — a spoofed userId in the body is ignored. */
export async function saveAccount(
  repo: AccountRepo,
  token: string,
  secret: string,
  plan: StampedState,
  now = Date.now(),
): Promise<boolean> {
  const userId = verifySessionToken(token, secret, now)
  if (!userId) return false
  await repo.savePlan(userId, plan)
  return true
}

/** In-memory AccountRepo — used by tests (and local dev without DATABASE_URL). */
export function memoryUserRepo(): AccountRepo {
  const byEmail = new Map<string, UserRecord>()
  const byId = new Map<string, UserRecord>()
  const plans = new Map<string, StampedState>()
  let seq = 0
  return {
    async findUserByEmail(email) {
      return byEmail.get(email) ?? null
    },
    async findUserById(id) {
      return byId.get(id) ?? null
    },
    async createUser(email, passwordHash) {
      seq += 1
      const user: UserRecord = { id: `mem-user-${seq}`, email, passwordHash, createdAt: Date.now() }
      byEmail.set(email, user)
      byId.set(user.id, user)
      return user
    },
    async getPlan(userId) {
      return plans.get(userId) ?? null
    },
    async savePlan(userId, plan) {
      if (!byId.has(userId)) throw new Error(`unknown user ${userId}`)
      plans.set(userId, plan)
    },
  }
}
