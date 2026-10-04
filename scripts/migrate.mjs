// Applies migrations/*.sql in order to the Neon database.
// Usage: DATABASE_URL=... node scripts/migrate.mjs
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
if (!connectionString) {
  console.error('DATABASE_URL (or POSTGRES_URL) is not set')
  process.exit(1)
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations')
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()

const client = new pg.Client({ connectionString })
await client.connect()
try {
  await client.query(
    'CREATE TABLE IF NOT EXISTS pomme_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  )
  for (const file of files) {
    const id = file.replace(/\.sql$/, '')
    const { rows } = await client.query('SELECT 1 FROM pomme_migrations WHERE id = $1', [id])
    if (rows.length) {
      console.log(`skip ${file} (already applied)`)
      continue
    }
    const sql = readFileSync(path.join(dir, file), 'utf8')
    await client.query('BEGIN')
    try {
      await client.query(sql)
      await client.query('INSERT INTO pomme_migrations (id) VALUES ($1) ON CONFLICT DO NOTHING', [id])
      await client.query('COMMIT')
      console.log(`applied ${file}`)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  }
  console.log('migrations up to date')
} finally {
  await client.end()
}
