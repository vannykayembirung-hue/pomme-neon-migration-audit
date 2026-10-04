import { mkdirSync, writeFileSync } from 'node:fs'
import { launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'
import { chromium } from '@playwright/test'

const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3100'
const paths = ['/', '/uk', '/mealime-alternative']
const chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] })
mkdirSync('qa-output', { recursive: true })

const out = {}
for (const path of paths) {
  const { lhr } = await lighthouse(`${base}${path}`, { port: chrome.port, output: 'json', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'], formFactor: 'mobile' })
  out[path] = {
    scores: Object.fromEntries(Object.entries(lhr.categories).map(([k, v]) => [k, Math.round((v.score ?? 0) * 100)])),
    lcpMs: Math.round(lhr.audits['largest-contentful-paint'].numericValue),
    cls: Number(lhr.audits['cumulative-layout-shift'].numericValue.toFixed(3)),
    tbtMs: Math.round(lhr.audits['total-blocking-time'].numericValue),
    failing: Object.values(lhr.audits).filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable').map((a) => `${a.id}: ${a.score}`).slice(0, 12),
  }
}
await chrome.kill()
writeFileSync('qa-output/lighthouse.json', JSON.stringify(out, null, 2))
console.log(JSON.stringify(out, null, 2))
