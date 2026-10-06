import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, weeklyPlans } from '@/lib/db/schema'

/** Admin account management: real rows from Neon, and right-to-erasure. */
export async function listAccounts() {
  const rows = await db
    .select({
      email: users.email,
      createdAt: users.createdAt,
      savedAt: weeklyPlans.updatedAt,
    })
    .from(users)
    .leftJoin(weeklyPlans, eq(weeklyPlans.userId, users.id))
    .orderBy(desc(users.createdAt))
    .limit(100)
  return rows.map((r) => ({
    email: r.email,
    createdAt: r.createdAt.toISOString(),
    savedAt: r.savedAt ? r.savedAt.toISOString() : null,
  }))
}

/** Right to erasure for an account: cascades to preferences and weekly plans. */
export async function forgetAccount(email: string) {
  await db.delete(users).where(eq(users.email, email.trim().toLowerCase()))
}
