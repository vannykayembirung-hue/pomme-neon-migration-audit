// One-off import of legacy JSON-file persistence into Neon.
// Reads POMME_DATA_DIR (default: /tmp/pomme-data) for subscribers.json, events.json,
// consent.json, email-queue.json and inserts them with ON CONFLICT DO NOTHING.
// Usage: DATABASE_URL=... POMME_DATA_DIR=/path node scripts/migrate-json-data.mjs
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
if (!connectionString) {
  console.error('DATABASE_URL (or POSTGRES_URL) is not set')
  process.exit(1)
}
const dir = process.env.POMME_DATA_DIR ?? '/tmp/pomme-data'
if (!existsSync(dir)) {
  console.log(`no legacy data directory at ${dir} — nothing to migrate`)
  process.exit(0)
}

const readJson = (file, fallback) => {
  const p = path.join(dir, file)
  if (!existsSync(p)) return fallback
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    console.warn(`skipping ${file}: unreadable JSON`)
    return fallback
  }
}

const client = new pg.Client({ connectionString })
await client.connect()
try {
  let imported = 0

  const subs = readJson('subscribers.json', [])
  for (const s of Array.isArray(subs) ? subs : []) {
    if (!s?.email || !s?.unsubscribeToken) continue
    await client.query(
      `INSERT INTO pomme_subscribers (email, locale, confirmed_at, unsubscribe_token)
       VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
      [s.email, s.locale === 'uk' ? 'uk' : 'us', s.confirmedAt ?? new Date().toISOString(), s.unsubscribeToken],
    )
    imported++
  }

  const pending = readJson('pending.json', readJson('pending-subscribers.json', []))
  for (const p of Array.isArray(pending) ? pending : []) {
    if (!p?.email || !p?.tokenHash) continue
    await client.query(
      `INSERT INTO pomme_pending_subscribers (email, locale, token_hash, created_at)
       VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
      [p.email, p.locale === 'uk' ? 'uk' : 'us', p.tokenHash, p.createdAt ?? new Date().toISOString()],
    )
    imported++
  }

  const events = readJson('events.json', [])
  for (const e of Array.isArray(events) ? events : []) {
    if (!e?.type) continue
    await client.query('INSERT INTO pomme_events (at, type, locale, detail) VALUES ($1, $2, $3, $4)', [
      e.at ?? new Date().toISOString(),
      String(e.type),
      e.locale === 'uk' ? 'uk' : 'us',
      e.detail ? String(e.detail).slice(0, 40) : null,
    ])
    imported++
  }

  const consent = readJson('consent.json', null)
  const counts = consent && typeof consent === 'object' ? consent : {}
  for (const choice of ['all', 'none', 'custom']) {
    const n = Number(counts[choice] ?? 0)
    for (let i = 0; i < n; i++) {
      await client.query('INSERT INTO pomme_consent_choices (choice) VALUES ($1)', [choice])
      imported++
    }
  }

  const queue = readJson('email-queue.json', readJson('queue.json', []))
  for (const q of Array.isArray(queue) ? queue : []) {
    if (!q?.email || !q?.kind) continue
    await client.query(
      `INSERT INTO pomme_email_queue (email, kind, status, attempts, next_attempt_at, created_at)
       VALUES ($1, $2, 'pending', 0, now(), $3) ON CONFLICT (email, kind) DO NOTHING`,
      [q.email, q.kind, q.createdAt ?? new Date().toISOString()],
    )
    imported++
  }

  console.log(`import complete: ${imported} records processed from ${dir}`)
} finally {
  await client.end()
}
