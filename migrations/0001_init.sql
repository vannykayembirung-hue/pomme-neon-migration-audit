-- Pomme production schema (Neon / PostgreSQL)
-- Idempotent: safe to run more than once.

CREATE TABLE IF NOT EXISTS pomme_subscribers (
  email              text PRIMARY KEY,
  locale             text NOT NULL DEFAULT 'us' CHECK (locale IN ('us', 'uk')),
  confirmed_at       timestamptz NOT NULL DEFAULT now(),
  unsubscribe_token  uuid NOT NULL DEFAULT gen_random_uuid()
);
-- Idempotency / lookup keys
CREATE UNIQUE INDEX IF NOT EXISTS pomme_subscribers_unsubscribe_token_key ON pomme_subscribers (unsubscribe_token);

CREATE TABLE IF NOT EXISTS pomme_pending_subscribers (
  email       text PRIMARY KEY,
  locale      text NOT NULL DEFAULT 'us' CHECK (locale IN ('us', 'uk')),
  token_hash  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS pomme_pending_token_hash_key ON pomme_pending_subscribers (token_hash);
-- Used by the 48 h TTL sweeps
CREATE INDEX IF NOT EXISTS pomme_pending_created_at_idx ON pomme_pending_subscribers (created_at);

CREATE TABLE IF NOT EXISTS pomme_events (
  id      bigserial PRIMARY KEY,
  at      timestamptz NOT NULL DEFAULT now(),
  type    text NOT NULL,
  locale  text NOT NULL,
  detail  text
);
CREATE INDEX IF NOT EXISTS pomme_events_at_idx ON pomme_events (at DESC);
CREATE INDEX IF NOT EXISTS pomme_events_type_idx ON pomme_events (type);

CREATE TABLE IF NOT EXISTS pomme_consent_choices (
  id      bigserial PRIMARY KEY,
  at      timestamptz NOT NULL DEFAULT now(),
  choice  text NOT NULL CHECK (choice IN ('all', 'none', 'custom'))
);
CREATE INDEX IF NOT EXISTS pomme_consent_at_idx ON pomme_consent_choices (at DESC);

CREATE TABLE IF NOT EXISTS pomme_email_queue (
  id               bigserial PRIMARY KEY,
  email            text NOT NULL,
  kind             text NOT NULL,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  attempts         integer NOT NULL DEFAULT 0,
  next_attempt_at  timestamptz NOT NULL DEFAULT now(),
  last_error       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  sent_at          timestamptz
);
-- Idempotency: one open job per (email, kind); retries update the same row.
CREATE UNIQUE INDEX IF NOT EXISTS pomme_email_queue_email_kind_key ON pomme_email_queue (email, kind);
-- Worker claim path: status + next_attempt_at with FOR UPDATE SKIP LOCKED
CREATE INDEX IF NOT EXISTS pomme_email_queue_due_idx ON pomme_email_queue (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS pomme_email_queue_email_idx ON pomme_email_queue (email);

CREATE TABLE IF NOT EXISTS pomme_sent_log (
  id      bigserial PRIMARY KEY,
  email   text NOT NULL,
  kind    text NOT NULL,
  period  text NOT NULL,
  at      timestamptz NOT NULL DEFAULT now()
);
-- Idempotency: at most one send per (email, kind, period)
CREATE UNIQUE INDEX IF NOT EXISTS pomme_sent_log_email_kind_period_key ON pomme_sent_log (email, kind, period);
CREATE INDEX IF NOT EXISTS pomme_sent_log_email_idx ON pomme_sent_log (email);

-- Migration bookkeeping
CREATE TABLE IF NOT EXISTS pomme_migrations (
  id         text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO pomme_migrations (id) VALUES ('0001_init') ON CONFLICT DO NOTHING;
