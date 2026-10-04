import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { sendEmail } from '@/lib/admin/email'
import { consentCounts, listEvents } from '@/lib/admin/events'
import { listEmails } from '@/lib/admin/subscribers'
import { cronAuthorised } from '@/lib/cron-auth'
import { redis } from '@/lib/redis'
import { SKILLS, safeRun } from '@/lib/skills'
import type { SkillContext } from '@/lib/skills/types'

async function readData<T>(file: string, fallback: T): Promise<T> {
  if (file === 'consent.json') return (await consentCounts()) as T
  if (file === 'events.json') return (await listEvents()) as T
  if (file === 'subscribers.json') return (await listEmails()) as T
  const value = await redis?.get<unknown>(`pomme:file:${file}`)
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }
  return value as T
}

const context: SkillContext = {
  now: new Date(),
  flags: { orphanCapture: process.env.FEATURE_ORPHAN_CAPTURE === 'true' },
  readJson: readData,
  async writeText(file, content) {
    if (!redis) throw new Error('Redis is not configured')
    await redis.set(`pomme:file:${file}`, content)
  },
  async listFiles(dir) {
    const full = path.join(/*turbopackIgnore: true*/ process.cwd(), dir)
    const names = await readdir(full)
    return Promise.all(names.map(async (name) => ({ name, bytes: (await stat(path.join(full, name))).size })))
  },
  async sendToFounder(subject, text) {
    const to = process.env.FOUNDER_EMAIL
    if (!to) return false
    const result = await sendEmail(to, { subject, text, html: `<pre>${text}</pre>` })
    return result.ok
  },
}

export async function GET(request: Request) {
  if (!cronAuthorised(request)) return new Response('Unauthorized', { status: 401 })
  const results = await Promise.all(SKILLS.map(async (s) => [s.name, await safeRun(s, { ...context, now: new Date() })] as const))
  return Response.json(Object.fromEntries(results))
}
