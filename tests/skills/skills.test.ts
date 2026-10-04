import assert from 'node:assert/strict'
import { test } from 'node:test'
import { consentRateSkill } from '../../lib/skills/consent-rate.ts'
import { imageBudgetSkill } from '../../lib/skills/image-budget.ts'
import { orphanCaptureSkill } from '../../lib/skills/orphan-capture.ts'
import { safeRun, type SkillContext } from '../../lib/skills/types.ts'
import { weeklyDigestSkill } from '../../lib/skills/weekly-digest.ts'

function makeContext(files: Record<string, unknown> = {}, overrides: Partial<SkillContext> = {}) {
  const written: Record<string, string> = {}
  const ctx: SkillContext = {
    now: new Date('2026-10-18T17:00:00Z'),
    flags: { orphanCapture: true },
    readJson: async (file, fallback) => (file in files ? (files[file] as never) : fallback),
    writeText: async (file, content) => {
      written[file] = content
    },
    listFiles: async () => [
      { name: 'a.webp', bytes: 90_000 },
      { name: 'b.webp', bytes: 300_000 },
    ],
    ...overrides,
  }
  return { ctx, written }
}

test('consent-rate reports delta against last week', async () => {
  const { ctx } = makeContext({
    'consent.json': { all: 6, none: 4, custom: 0 },
    'consent_prev.json': { all: 4, none: 6, custom: 0 },
  })
  const result = await consentRateSkill.run(ctx)
  assert.match(result.summary, /60%.*\+20/)
})

test('orphan-capture writes a draft and never posts', async () => {
  const { ctx, written } = makeContext()
  const result = await orphanCaptureSkill.run(ctx)
  assert.ok(result.ok)
  assert.ok(Object.keys(written)[0].startsWith('drafts/'))
  const off = makeContext({}, { flags: { orphanCapture: false } })
  await orphanCaptureSkill.run(off.ctx)
  assert.deepEqual(off.written, {})
})

test('weekly-digest counts only the last 7 days', async () => {
  const { ctx } = makeContext({
    'events.json': [
      { at: '2026-10-17T10:00:00Z', type: 'plan_generated' },
      { at: '2026-09-01T10:00:00Z', type: 'plan_generated' },
    ],
    'subscribers.json': [{}, {}],
  })
  const result = await weeklyDigestSkill.run(ctx)
  assert.match((result.data as { text: string }).text, /Plans generated: 1/)
})

test('image-budget flags files over 200 KB', async () => {
  const { ctx } = makeContext()
  const result = await imageBudgetSkill.run(ctx)
  assert.equal(result.ok, false)
  assert.match(result.summary, /b\.webp/)
})

test('safeRun never throws', async () => {
  const { ctx } = makeContext({}, { readJson: async () => { throw new Error('boom') } })
  const result = await safeRun(consentRateSkill, ctx)
  assert.equal(result.ok, false)
})
