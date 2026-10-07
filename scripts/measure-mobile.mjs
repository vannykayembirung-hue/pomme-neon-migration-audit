/**
 * Mobile overflow hunter (P1-2): walks the real UI at 390x844 and reports
 * document scrollWidth after EVERY state change to find what widens the page.
 * Usage: node scripts/measure-mobile.mjs [url] [screenshot-prefix]
 */
import { chromium } from '@playwright/test'

const url = process.argv[2] ?? 'http://localhost:3000/'
const prefix = process.argv[3] ?? 'mobile'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
if (process.env.BLOCK_FONTS === '1') {
  await page.route('**/*.{woff,woff2,ttf,otf}', (route) => route.abort())
  console.log('(font requests blocked — fallback font metrics)')
}

async function measure(label) {
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const scrollWidth = document.documentElement.scrollWidth
    const offenders = []
    for (const el of document.querySelectorAll('*')) {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) continue
      if (rect.right > vw + 1) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className).slice(0, 80),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        })
      }
    }
    offenders.sort((a, b) => b.right - a.right)
    return { vw, scrollWidth, worst: offenders.slice(0, 6) }
  })
  const flag = r.scrollWidth > r.vw ? ' ❌ OVERFLOW' : ' ✅'
  console.log(`\n[${label}] scrollWidth=${r.scrollWidth}${flag}`)
  for (const o of r.worst) console.log(`   → ${o.tag}.${o.cls} right=${o.right} w=${o.width}`)
  if (r.scrollWidth > r.vw) await page.screenshot({ path: `${prefix}-${label.replace(/\W+/g, '-')}.png` })
  return r
}

await page.goto(url, { waitUntil: 'networkidle' })
for (const label of ['Reject all', 'Reject', 'No thanks']) {
  const btn = page.getByRole('button', { name: label }).first()
  if (await btn.isVisible().catch(() => false)) {
    await btn.click().catch(() => {})
    break
  }
}
await measure('1-home')

// Family plan with leftovers (batch) — the heaviest real week.
const note = page.locator('#week-note')
await note.fill('4 kids and 2 adults, busy week, $120')
await note.press('Enter')
await page.waitForSelector('text=Pomme noticed', { timeout: 20000 }).catch(() => {})
await page.waitForTimeout(800)
await measure('2-plan-generated')

// Open the swap picker on the first meal day.
const swap = page.getByRole('button', { name: 'Swap' }).first()
if (await swap.isVisible().catch(() => false)) {
  await swap.click().catch(() => {})
  await page.waitForTimeout(600)
  await measure('3-swap-picker-open')
  await page.keyboard.press('Escape').catch(() => {})
  await page.waitForTimeout(400)
}

// Open a recipe.
const day = page.locator('#sunday-plan [role="tabpanel"] button').first()
if (await day.isVisible().catch(() => false)) {
  await day.click().catch(() => {})
  await page.waitForTimeout(600)
  await measure('4-recipe-open')
  await page.keyboard.press('Escape').catch(() => {})
  await page.waitForTimeout(400)
}

// Basket tab.
const basketTab = page.getByRole('tab', { name: /Basket/ }).first()
if (await basketTab.isVisible().catch(() => false)) {
  await basketTab.click().catch(() => {})
  await page.waitForTimeout(500)
  await measure('5-basket')
}

await page.screenshot({ path: `${prefix}-final.png`, fullPage: true })
await browser.close()
