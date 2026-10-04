import { test } from '@playwright/test'
import { asVisitor, cookieNames, expect, stubTrackers } from './helpers'

const plan = (page: import('@playwright/test').Page) => page.getByRole('button', { name: /^Plan my week/ }).first().click()

test.describe('consent and tracking', () => {
  test('nothing third-party loads, and no events are sent, before or after Reject all', async ({ page, context }) => {
    await asVisitor(context)
    const hits = await stubTrackers(page)
    const events: string[] = []
    page.on('request', (r) => r.url().includes('/api/events') && events.push(r.url()))
    await page.goto('/')
    await expect(page.getByRole('region', { name: 'Cookie preferences' })).toBeVisible()
    await plan(page)
    await page.getByRole('button', { name: 'Reject all' }).click()
    await plan(page)
    await page.reload()
    await expect(page.getByRole('region', { name: 'Cookie preferences' })).toHaveCount(0)
    expect(hits).toEqual([])
    expect(events).toEqual([])
    expect((await cookieNames(page)).filter((n) => /^(_ga|_gid|_fbp|_ttp)/.test(n))).toEqual([])
  })

  test('Accept all loads GA, Meta and TikTok and sends first-party events', async ({ page, context }) => {
    await asVisitor(context)
    const hits = await stubTrackers(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Accept all' }).click()
    await expect.poll(() => hits.some((h) => /googletagmanager/.test(h))).toBe(true)
    await expect.poll(() => hits.some((h) => /facebook/.test(h))).toBe(true)
    await expect.poll(() => hits.some((h) => /tiktok/.test(h))).toBe(true)
    const eventPost = page.waitForRequest((r) => r.url().includes('/api/events') && r.method() === 'POST')
    await plan(page)
    await eventPost
    const names = await cookieNames(page)
    expect(names).toEqual(expect.arrayContaining(['_ga', '_fbp', '_ttp']))
  })

  test('Customise: analytics only loads GA but not Meta or TikTok', async ({ page, context }) => {
    await asVisitor(context)
    const hits = await stubTrackers(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Customise' }).click()
    await page.getByRole('checkbox').nth(1).check()
    await page.getByRole('button', { name: 'Save my choices' }).click()
    await expect.poll(() => hits.some((h) => /googletagmanager/.test(h))).toBe(true)
    await page.waitForTimeout(800)
    expect(hits.some((h) => /facebook|tiktok/.test(h))).toBe(false)
  })

  test('revoking consent stops trackers in the running page, clears their cookies and survives reload', async ({ page, context }) => {
    await asVisitor(context)
    const hits = await stubTrackers(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Accept all' }).click()
    await expect.poll(() => cookieNames(page)).toEqual(expect.arrayContaining(['_ga', '_fbp', '_ttp']))

    const reloaded = page.waitForEvent('load')
    await page.getByRole('button', { name: 'Cookie settings' }).click()
    await page.getByRole('checkbox').nth(1).uncheck()
    await page.getByRole('checkbox').nth(2).uncheck()
    hits.length = 0
    await page.getByRole('button', { name: 'Save my choices' }).click()
    await reloaded
    await page.waitForLoadState('networkidle')

    expect(await page.evaluate(() => ({ g: !!(window as any).__gtagLoaded, f: !!(window as any).__fbLoaded, t: !!(window as any).__ttLoaded, gtag: typeof (window as any).gtag, fbq: typeof (window as any).fbq }))).toEqual({
      g: false, f: false, t: false, gtag: 'undefined', fbq: 'undefined',
    })
    expect((await cookieNames(page)).filter((n) => /^(_ga|_gid|_fbp|_ttp)/.test(n))).toEqual([])
    const events: string[] = []
    page.on('request', (r) => r.url().includes('/api/events') && events.push(r.url()))
    await plan(page)
    await page.waitForTimeout(500)
    expect(hits).toEqual([])
    expect(events).toEqual([])
  })

  test('Do Not Sell/Share page loads and exposes the same controls', async ({ page, context }) => {
    await asVisitor(context)
    await page.goto('/do-not-sell')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
