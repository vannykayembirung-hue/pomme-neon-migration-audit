import { expect, type BrowserContext, type Page } from '@playwright/test'
import pg from 'pg'

export const MOCK = 'http://127.0.0.1:4010'
export const QA_DOMAIN = 'pomme-qa.example'

let counter = 0
export const uniqueEmail = () => `qa-${Date.now().toString(36)}-${counter++}@${QA_DOMAIN}`
export const uniqueIp = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${counter++ % 250}`

let pool: pg.Pool | null = null
export const sql = async <T = Record<string, unknown>>(text: string, params: unknown[] = []) => {
  pool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 })
  return (await pool.query(text, params)).rows as T[]
}
export const closeDb = () => pool?.end()

export async function cleanupQaRows() {
  const like = `%@${QA_DOMAIN}`
  for (const t of ['pomme_subscribers', 'pomme_pending_subscribers', 'pomme_email_queue', 'pomme_sent_log']) {
    await sql(`DELETE FROM ${t} WHERE email LIKE $1`, [like])
  }
}

export type Sent = { to: string; subject: string; text: string; html: string; headers?: Record<string, string>; idempotencyKey: string | null }
export const sentMail = async (): Promise<Sent[]> => (await fetch(`${MOCK}/sent`)).json()
export const resetMock = () => fetch(`${MOCK}/reset`, { method: 'POST' })
export const failNext = (n: number) => fetch(`${MOCK}/fail?n=${n}`, { method: 'POST' })

export async function waitForMail(to: string, subject: RegExp, timeoutMs = 10_000) {
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    const hit = (await sentMail()).find((m) => m.to === to && subject.test(m.subject))
    if (hit) return hit
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`No email to ${to} matching ${subject}`)
}

/** Email links carry the production origin; QA rewrites them to the server under test. */
export function linkFrom(text: string, pathPrefix: string, base: string) {
  const match = text.match(new RegExp(`https?://[^\\s"<>]+${pathPrefix.replace(/\//g, '\\/')}[^\\s"<>]*`))
  if (!match) throw new Error(`No link containing ${pathPrefix}`)
  const u = new URL(match[0])
  return new URL(u.pathname + u.search, base).toString()
}

export async function asVisitor(context: BrowserContext, opts: { ip?: string; acceptLanguage?: string } = {}) {
  await context.setExtraHTTPHeaders({
    'x-forwarded-for': opts.ip ?? uniqueIp(),
    ...(opts.acceptLanguage ? { 'accept-language': opts.acceptLanguage } : {}),
  })
}

export const TRACKER_HOSTS = /(googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|facebook\.com\/tr|analytics\.tiktok\.com|\/_vercel\/insights)/

/** Serves harmless stand-ins for third-party trackers and records every request made to them. */
export async function stubTrackers(page: Page) {
  const hits: string[] = []
  await page.route(TRACKER_HOSTS, async (route) => {
    const url = route.request().url()
    hits.push(url)
    const body = /googletagmanager/.test(url)
      ? "document.cookie='_ga=GA1.1.1.1; Path=/'; document.cookie='_gid=GA1.1.2.2; Path=/'; window.__gtagLoaded=true;"
      : /facebook/.test(url)
        ? "document.cookie='_fbp=fb.1.1.1; Path=/'; window.__fbLoaded=true;"
        : /tiktok/.test(url)
          ? "document.cookie='_ttp=tt1; Path=/'; window.__ttLoaded=true;"
          : ''
    await route.fulfill({ status: 200, contentType: 'application/javascript', body })
  })
  return hits
}

export const cookieNames = async (page: Page) => (await page.context().cookies()).map((c) => c.name)
export { expect }
