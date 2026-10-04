import { bigserial, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

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
