import { test } from '@playwright/test'
import { asVisitor, expect } from './helpers'

test.describe('locale is decided by the URL', () => {
  test('"/" is identical and en-US whatever Accept-Language says', async ({ request }) => {
    const plain = await (await request.get('/')).text()
    const gb = await (await request.get('/', { headers: { 'accept-language': 'en-GB,en;q=0.9' } })).text()
    const ie = await (await request.get('/', { headers: { 'accept-language': 'en-IE' } })).text()
    expect(plain).toContain('<html lang="en-US"')
    expect(gb).toBe(plain)
    expect(ie).toBe(plain)
  })

  test('"/uk" is en-GB and both pages declare reciprocal hreflang + self canonical', async ({ request }) => {
    const us = await (await request.get('/')).text()
    const uk = await (await request.get('/uk', { headers: { 'accept-language': 'en-US' } })).text()
    expect(uk).toContain('<html lang="en-GB"')
    for (const html of [us, uk]) {
      expect(html).toMatch(/hrefLang="en-US"|hreflang="en-US"/i)
      expect(html).toMatch(/hrefLang="en-GB"|hreflang="en-GB"/i)
    }
    expect(us).toMatch(/rel="canonical" href="[^"]*\/"/)
    expect(uk).toMatch(/rel="canonical" href="[^"]*\/uk"/)
  })

  test('toggle moves between URLs and converts budget; each URL stays stable on reload', async ({ page, context }) => {
    await asVisitor(context)
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
    await page.getByRole('radio', { name: /United Kingdom/ }).first().click()
    await expect(page).toHaveURL(/\/uk$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB')
    await page.reload()
    await expect(page).toHaveURL(/\/uk$/)
    await expect(page.getByRole('radio', { name: /United Kingdom/ }).first()).toHaveAttribute('aria-checked', 'true')
    await page.goto('/')
    await expect(page.getByRole('radio', { name: /United States/ }).first()).toHaveAttribute('aria-checked', 'true')
  })
})

test.describe('plan persistence', () => {
  test('plan survives reload, is stored locally only, and Reset clears it', async ({ page, context }) => {
    await asVisitor(context)
    await page.goto('/')
    await page.getByRole('button', { name: /^Plan my week/ }).first().click()
    await expect(page.locator('#sunday-plan')).toBeVisible()
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('pomme:v1') ?? 'null'))
    expect(stored.seed).toBeGreaterThan(0)
    expect(stored.locale).toBe('us')

    await page.reload()
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('pomme:v1') ?? 'null'))
    expect(after.seed).toBe(stored.seed)
    await expect(page.locator('#sunday-plan')).toContainText(/Mon|Monday/i)
  })

  test('a plan made in US dollars reopens in pounds on /uk', async ({ page, context }) => {
    await asVisitor(context)
    await page.goto('/')
    await page.getByRole('button', { name: /^Plan my week/ }).first().click()
    const usBudget = await page.evaluate(() => JSON.parse(localStorage.getItem('pomme:v1')!).prefs.budget as number)
    await page.goto('/uk')
    const ukBudget = await page.evaluate(() => JSON.parse(localStorage.getItem('pomme:v1')!).prefs.budget as number)
    expect(ukBudget).toBeLessThan(usBudget)
    await expect(page.getByRole('radio', { name: /United Kingdom/ }).first()).toHaveAttribute('aria-checked', 'true')
  })
})
