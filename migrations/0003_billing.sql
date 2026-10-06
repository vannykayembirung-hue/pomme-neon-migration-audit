-- Phase 2.9 — prepaid Pomme Plus via SasPay. Keyed by email (like the newsletter tables).
-- Apply in the Neon SQL Editor. Idempotent.

CREATE TABLE IF NOT EXISTS pomme_entitlements (
  email text PRIMARY KEY,
  plus_until timestamptz,
  trial_used boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pomme_orders (
  id text PRIMARY KEY,             -- SasPay checkout session id
  email text NOT NULL,
  plan text NOT NULL,              -- 'monthly' | 'annual'
  status text NOT NULL DEFAULT 'pending',  -- pending | paid
  created_at timestamptz NOT NULL DEFAULT now()
);
