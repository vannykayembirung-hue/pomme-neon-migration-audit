import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// DATABASE_URL is the Neon convention; POSTGRES_URL is what the Vercel-Neon
// integration injects. Server-side only — this module is never imported by
// client components and the variable is never prefixed NEXT_PUBLIC.
const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL

const globalForPool = globalThis as unknown as { pommePool?: Pool }

export const pool =
  globalForPool.pommePool ??
  new Pool({
    connectionString,
    // Small pool: serverless instances are short-lived and numerous.
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    // Neon requires TLS outside local development.
    ssl: connectionString && !connectionString.includes('localhost') ? { rejectUnauthorized: false } : undefined,
  })

if (process.env.NODE_ENV !== 'production') globalForPool.pommePool = pool

export const db = drizzle(pool, { schema })
