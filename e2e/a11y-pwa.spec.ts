import AxeBuilder from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { test } from '@playwright/test'
import { asVisitor, expect } from './helpers'

const PAGES = ['/', '/uk', '/privacy', '/do-not-sell', '/offline', '/mealime-alternative', '/platejoy-alternative', '/best-sunday-meal-planner-2026', '/newsletter/confirm?token=none', '/newsletter/unsubscribe?token=none', '/newsletter/done?status=confirmed']

const summary: Record<string, unknown> = {}
test.afterAll(() => {
  mkdirSync('qa-output', { recursive: true })
  writeFileSync('qa-output/axe.json', JSON.stringify(summary, null, 2))
})

test.describe('accessibility (axe, WCAG 2.2 AA tags)', () => {
  for (const path of PAGES) {
    for (const banner of [true, false]) {
      test(`${path} ${banner ? 'with' : 'without'} cookie banner`, async ({ page, context }) => {
        await asVisitor(context)
        await page.goto(path)
        if (!banner) {
          const reject = page.getByRole('button', { name: 'Reject all' })
          if (await reject.count()) await reject.click()
        }
        await page.waitForLoadState('networkidle')
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze()
        const key = `${path} ${banner ? '[banner]' : '[no banner]'}`
        summary[key] = results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, target: v.nodes[0]?.target }))
        const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
        expect(blocking.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([])
      })
    }
  }
})

test.describe('PWA', () => {
  test('manifest is installable-grade and icons resolve', async ({ page, request }) => {
    const manifest = await (await request.get('/manifest.webmanifest')).json()
    expect(manifest.name).toBeTruthy()
    expect(manifest.start_url).toBeTruthy()
    expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(manifest.display)
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes).join(' ')
    expect(sizes).toMatch(/192x192/)
    expect(sizes).toMatch(/512x512/)
    for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200)

    await page.goto('/')
    const cdp = await page.context().newCDPSession(page)
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
    expect(installabilityErrors.map((e: { errorId: string }) => e.errorId)).toEqual([])
  })

  test('service worker serves a visited page and the offline fallback with no network', async ({ page, context }) => {
    await asVisitor(context)
    await page.goto('/')
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
    await page.reload()
    await page.getByRole('button', { name: /^Plan my week/ }).first().click()
    await page.goto('/privacy')
    await page.goto('/')
    await context.setOffline(true)
    await page.goto('/')
    await expect(page.getByRole('button', { name: /^Plan my week/ }).first()).toBeVisible()
    await page.goto('/mealime-alternative').catch(() => {})
    await expect(page.getByRole('heading', { name: /offline/i })).toBeVisible()
    await expect(page.getByText(/Your last plan is still here/)).toBeVisible()
    await context.setOffline(false)
  })
})
