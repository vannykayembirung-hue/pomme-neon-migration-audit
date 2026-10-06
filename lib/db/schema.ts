import { bigserial, boolean, integer, jsonb, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core'

export const subscribers = pgTable('pomme_subscribers', {
  email: text('email').primaryKey(),
  locale: text('locale').notNull().default('us'),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  unsubscribeToken: uuid('unsubscribe_token').notNull().unique().defaultRandom(),
})

export const pendingSubscribers = pgTable('pomme_pending_subscribers', {
  email: text('email').primaryKey(),
  locale: text('locale').notNull().default('us'),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
})

export const events = pgTable('pomme_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  at: timestamp('at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  type: text('type').notNull(),
  locale: text('locale').notNull(),
  detail: text('detail'),
})

export const consentChoices = pgTable('pomme_consent_choices', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  at: timestamp('at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  choice: text('choice').notNull(),
})

export const emailQueue = pgTable(
  'pomme_email_queue',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    email: text('email').notNull(),
    kind: text('kind').notNull(),
    status: text('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    sentAt: timestamp('sent_at', { withTimezone: true, mode: 'date' }),
  },
  (t) => [unique().on(t.email, t.kind)],
)

export const sentLog = pgTable(
  'pomme_sent_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    email: text('email').notNull(),
    kind: text('kind').notNull(),
    period: text('period').notNull(),
    at: timestamp('at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.email, t.kind, t.period)],
)

// ── Phase 2.5: accounts. Neon is the source of truth. ─────────────────────────

export const users = pgTable('pomme_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
})

export const userPreferences = pgTable('pomme_user_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** PommeState.prefs (+ future memory) as JSON. */
  prefs: jsonb('prefs').notNull(),
  memory: jsonb('memory'),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
})

export const weeklyPlans = pgTable('pomme_weekly_plans', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** Full PommeState payload (prefs, planPrefs, seed, swaps, checked, savedAt). */
  state: jsonb('state').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
})

// ── Phase 2.9: prepaid Pomme Plus (SasPay). Keyed by email. ──────────────────

export const entitlements = pgTable('pomme_entitlements', {
  email: text('email').primaryKey(),
  plusUntil: timestamp('plus_until', { withTimezone: true, mode: 'date' }),
  trialUsed: boolean('trial_used').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
})

export const orders = pgTable('pomme_orders', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  plan: text('plan').notNull(),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
})
