import { test } from '@playwright/test'
import {
  asVisitor, cleanupQaRows, closeDb, expect, failNext, linkFrom, resetMock, sentMail, sql, uniqueEmail, uniqueIp, waitForMail,
} from './helpers'

const CRON = { authorization: 'Bearer qa-cron-secret' }
const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3100'

test.beforeEach(async () => {
  await resetMock()
})
test.afterAll(async () => {
  await cleanupQaRows()
  await closeDb()
})

async function subscribeViaUi(page: import('@playwright/test').Page, email: string) {
  await page.goto('/')
  const form = page.locator('#newsletter-email')
  await form.scrollIntoViewIfNeeded()
  await form.fill(email)
  await page.getByRole('button', { name: 'Send me Sunday' }).click()
  await expect(page.getByText(/Check your inbox/)).toBeVisible()
}

test.describe('newsletter lifecycle (provider = local capture server)', () => {
  test('subscribe, scanner-safe confirm, welcome email, scanner-safe unsubscribe', async ({ page, context, request }) => {
    const email = uniqueEmail()
    await asVisitor(context)
    await subscribeViaUi(page, email)

    const confirmMail = await waitForMail(email, /Confirm your Sunday/)
    expect(confirmMail.text).toContain('Confirm:')
    const confirmUrl = linkFrom(confirmMail.text, '/newsletter/confirm', BASE)

    const [pending] = await sql<{ token_hash: string }>('SELECT token_hash FROM pomme_pending_subscribers WHERE email=$1', [email])
    expect(pending.token_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(confirmUrl).not.toContain(pending.token_hash)

    // A mail scanner prefetching the link must not subscribe anyone.
    expect((await request.get(confirmUrl)).status()).toBe(200)
    expect((await request.get(confirmUrl)).status()).toBe(200)
    expect(await sql('SELECT 1 FROM pomme_subscribers WHERE email=$1', [email])).toHaveLength(0)

    await page.goto(confirmUrl)
    await page.getByRole('button', { name: 'Yes, send me Sunday' }).click()
    await expect(page).toHaveURL(/\/newsletter\/done\?status=confirmed$/)
    await expect(page.getByText(/welcome email is on its way/)).toBeVisible()

    const welcome = await waitForMail(email, /first Sunday/)
    expect(welcome.idempotencyKey).toBe(`welcome:${email}`)
    expect(welcome.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
    expect(welcome.headers?.['List-Unsubscribe']).toMatch(/\/api\/newsletter\/unsubscribe\?token=/)
    expect((await sentMail()).filter((m) => m.to === email && /first Sunday/.test(m.subject))).toHaveLength(1)

    // Confirm link is single use.
    await page.goto(confirmUrl)
    await expect(page.getByText('That link has expired.')).toBeVisible()

    const unsubUrl = linkFrom(welcome.text, '/newsletter/unsubscribe', BASE)
    expect((await request.get(unsubUrl)).status()).toBe(200)
    expect(await sql('SELECT 1 FROM pomme_subscribers WHERE email=$1', [email])).toHaveLength(1)
    await page.goto(unsubUrl)
    await page.getByRole('button', { name: 'Unsubscribe me' }).click()
    await expect(page.getByText('You are unsubscribed.')).toBeVisible()
    expect(await sql('SELECT 1 FROM pomme_subscribers WHERE email=$1', [email])).toHaveLength(0)
  })

  test('RFC 8058 one-click unsubscribe works by POST only', async ({ page, context, request }) => {
    const email = uniqueEmail()
    await asVisitor(context)
    await subscribeViaUi(page, email)
    const confirmUrl = linkFrom((await waitForMail(email, /Confirm/)).text, '/newsletter/confirm', BASE)
    await page.goto(confirmUrl)
    await page.getByRole('button', { name: 'Yes, send me Sunday' }).click()
    const welcome = await waitForMail(email, /first Sunday/)
    const oneClick = welcome.headers!['List-Unsubscribe'].replace(/^<|>$/g, '')
    const target = new URL(new URL(oneClick).pathname + new URL(oneClick).search, BASE).toString()
    expect((await request.get(target)).status()).toBe(405)
    expect(await sql('SELECT 1 FROM pomme_subscribers WHERE email=$1', [email])).toHaveLength(1)
    expect((await request.post(target, { headers: { 'x-forwarded-for': uniqueIp() }, data: 'List-Unsubscribe=One-Click' })).status()).toBe(200)
    expect(await sql('SELECT 1 FROM pomme_subscribers WHERE email=$1', [email])).toHaveLength(0)
  })

  test('provider outage: confirmation still succeeds, welcome is queued and retried by cron exactly once', async ({ page, context, request }) => {
    const email = uniqueEmail()
    await asVisitor(context)
    await subscribeViaUi(page, email)
    const confirmUrl = linkFrom((await waitForMail(email, /Confirm/)).text, '/newsletter/confirm', BASE)

    await failNext(2)
    await page.goto(confirmUrl)
    await page.getByRole('button', { name: 'Yes, send me Sunday' }).click()
    await expect(page).toHaveURL(/status=confirmed&delayed=1/)
    await expect(page.getByText(/delayed/)).toBeVisible()

    const [job] = await sql<{ status: string; attempts: number; last_error: string }>('SELECT status, attempts, last_error FROM pomme_email_queue WHERE email=$1', [email])
    expect(job.status).toBe('pending')
    expect(job.attempts).toBe(2)
    expect(job.last_error).toBe('resend 500')
    expect((await sentMail()).filter((m) => m.to === email && /first Sunday/.test(m.subject))).toHaveLength(0)

    expect((await request.get('/api/cron/email-queue')).status()).toBe(401)
    // Not due yet: backoff holds.
    expect((await (await request.get('/api/cron/email-queue', { headers: CRON })).json()).sent).toBe(0)

    await sql(`UPDATE pomme_email_queue SET next_attempt_at = now() WHERE email=$1`, [email])
    const run = await (await request.get('/api/cron/email-queue', { headers: CRON })).json()
    expect(run.sent).toBeGreaterThanOrEqual(1)
    await waitForMail(email, /first Sunday/)
    const [done] = await sql<{ status: string }>('SELECT status FROM pomme_email_queue WHERE email=$1', [email])
    expect(done.status).toBe('sent')

    const again = await (await request.get('/api/cron/email-queue', { headers: CRON })).json()
    expect(again.sent).toBe(0)
    expect((await sentMail()).filter((m) => m.to === email && /first Sunday/.test(m.subject))).toHaveLength(1)
  })

  test('Sunday reminder: at most one per subscriber per week, even if cron fires twice', async ({ request }) => {
    const email = uniqueEmail()
    await sql(`INSERT INTO pomme_subscribers (email, locale) VALUES ($1,'us')`, [email])
    const first = await (await request.get('/api/cron/sunday-reminder', { headers: CRON })).json()
    const second = await (await request.get('/api/cron/sunday-reminder', { headers: CRON })).json()
    const mine = (await sentMail()).filter((m) => m.to === email)
    expect(mine).toHaveLength(1)
    expect(first.sent).toBeGreaterThanOrEqual(1)
    expect(second.sent).toBe(0)
    expect(mine[0].headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
  })

  test('abuse controls: per-IP and per-address limits, and no list probing', async ({ request }) => {
    const ip = uniqueIp()
    const post = (email: string, forwarded = ip) =>
      request.post('/api/newsletter/subscribe', { headers: { 'x-forwarded-for': forwarded }, data: { email, locale: 'us' } })

    const codes: number[] = []
    for (let i = 0; i < 7; i++) codes.push((await post(uniqueEmail())).status())
    expect(codes.slice(0, 5).every((c) => c === 200)).toBe(true)
    expect(codes.slice(5)).toEqual([429, 429])

    const victim = uniqueEmail()
    const results: number[] = []
    for (let i = 0; i < 4; i++) results.push((await post(victim, uniqueIp())).status())
    expect(results).toEqual([200, 200, 200, 429])
    expect((await sentMail()).filter((m) => m.to === victim)).toHaveLength(3)

    expect((await post('not-an-email', uniqueIp())).status()).toBe(400)

    const known = uniqueEmail()
    await sql(`INSERT INTO pomme_subscribers (email) VALUES ($1)`, [known])
    const a = await post(known, uniqueIp())
    const b = await post(uniqueEmail(), uniqueIp())
    expect([a.status(), await a.json()]).toEqual([b.status(), await b.json()])
  })

  test('admin login is rate limited and the metrics API is closed without a session', async ({ request }) => {
    const ip = uniqueIp()
    const codes: number[] = []
    for (let i = 0; i < 10; i++) {
      codes.push((await request.post('/admin/api/login', { headers: { 'x-forwarded-for': ip }, data: { passphrase: 'wrong' } })).status())
    }
    expect(codes.slice(0, 8).every((c) => c === 401)).toBe(true)
    expect(codes.slice(8).every((c) => c === 429)).toBe(true)
    expect([401, 403, 404, 307]).toContain((await request.get('/admin/api/metrics', { maxRedirects: 0 })).status())
  })
})
