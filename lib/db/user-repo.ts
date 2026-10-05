/**
 * Phase 2.5 — AccountRepo backed by Neon/Drizzle (the source of truth).
 * Every read/write is keyed by the user id coming from the verified session —
 * there is no query in this file that can return another user's row.
 */
import { eq } from 'drizzle-orm'
import { db } from '.'
import { users, weeklyPlans } from './schema'
import type { AccountRepo, UserRecord } from '@/lib/pomme/account'
import type { StampedState } from '@/lib/pomme/merge'

export function drizzleUserRepo(): AccountRepo {
  const toRecord = (row: typeof users.$inferSelect): UserRecord => ({
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt.getTime(),
  })
  return {
    async findUserByEmail(email: string): Promise<UserRecord | null> {
      const rows = await db.select().from(users).where(eq(users.email, email)).limit(1)
      return rows[0] ? toRecord(rows[0]) : null
    },

    async findUserById(id: string): Promise<UserRecord | null> {
      const rows = await db.select().from(users).where(eq(users.id, id)).limit(1)
      return rows[0] ? toRecord(rows[0]) : null
    },

    async createUser(email: string, passwordHash: string): Promise<UserRecord> {
      const rows = await db.insert(users).values({ email, passwordHash }).returning()
      const row = rows[0]
      return { id: row.id, email: row.email, passwordHash: row.passwordHash, createdAt: row.createdAt.getTime() }
    },

    async getPlan(userId: string): Promise<StampedState | null> {
      const rows = await db.select().from(weeklyPlans).where(eq(weeklyPlans.userId, userId)).limit(1)
      const row = rows[0]
      if (!row) return null
      return row.state as StampedState
    },

    async savePlan(userId: string, plan: StampedState): Promise<void> {
      await db
        .insert(weeklyPlans)
        .values({ userId, state: plan })
        .onConflictDoUpdate({ target: weeklyPlans.userId, set: { state: plan, updatedAt: new Date() } })
    },
  }
}
