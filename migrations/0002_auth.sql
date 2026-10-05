-- Phase 2.5: accounts. Neon is the source of truth.
-- Applied by scripts/migrate.mjs (tracked in pomme_migrations).

CREATE TABLE IF NOT EXISTS pomme_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pomme_user_preferences (
  user_id uuid PRIMARY KEY REFERENCES pomme_users (id) ON DELETE CASCADE,
  prefs jsonb NOT NULL,
  memory jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pomme_weekly_plans (
  user_id uuid PRIMARY KEY REFERENCES pomme_users (id) ON DELETE CASCADE,
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
