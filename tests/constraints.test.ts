/**
 * P0 regression — free-text constraints are never silently dropped.
 * Anything Pomme cannot enforce is surfaced in `unapplied`; anything that maps
 * to a real filter is applied. Allergy-class phrases always warn.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_PREFS, parseWeekNote } from '../lib/pomme/plan.ts'

test('audit repro: "two of us, nut allergy, gluten free, no meat"', () => {
  const r = parseWeekNote('two of us, nut allergy, gluten free, no meat', DEFAULT_PREFS, 'us')
  assert.equal(r.prefs.household, 2)
  assert.ok(r.prefs.avoid.includes('meat'), '"no meat" must set the meat filter')
  assert.ok(r.unapplied.length >= 2, 'nut allergy and gluten must warn, never vanish')
  assert.ok(r.unapplied.some((u) => u.includes('nut')), `expected a nut warning, got: ${r.unapplied.join(' | ')}`)
  assert.ok(r.unapplied.some((u) => u.includes('gluten')), `expected a gluten warning, got: ${r.unapplied.join(' | ')}`)
})

test('"without meat" and "meat-free" set the meat filter', () => {
  for (const note of ['without meat', 'meat-free week', "don't eat meat"]) {
    const r = parseWeekNote(note, DEFAULT_PREFS, 'us')
    assert.ok(r.prefs.avoid.includes('meat'), `${note} must set the meat filter`)
  }
})

test('"lactose intolerant" and "no milk" set the dairy filter', () => {
  for (const note of ['lactose intolerant', 'no milk please', 'lactose-free']) {
    const r = parseWeekNote(note, DEFAULT_PREFS, 'us')
    assert.ok(r.prefs.avoid.includes('dairy'), `${note} must set the dairy filter`)
  }
})

test('"pescatarian" excludes meat but keeps fish', () => {
  const r = parseWeekNote('pescatarian please', DEFAULT_PREFS, 'us')
  assert.ok(r.prefs.avoid.includes('meat'))
  assert.ok(!r.prefs.avoid.includes('fish'))
})

test('uncheckable constraints always warn: halal, keto, no pork, shellfish allergy', () => {
  for (const note of ['halal only', 'we eat keto', 'no pork', 'shellfish allergy']) {
    const r = parseWeekNote(note, DEFAULT_PREFS, 'us')
    assert.ok(r.unapplied.length > 0, `${note} must never be silently ignored`)
  }
})

test('clean notes produce no warnings (no false alarms)', () => {
  for (const note of ['vegan week', 'no fish, mushrooms', 'busy week, just me, $60', 'tired, relaxed saturday']) {
    const r = parseWeekNote(note, DEFAULT_PREFS, 'us')
    assert.deepEqual(r.unapplied, [], `${note} should not warn`)
  }
})

test('existing parsing still works alongside the new rules', () => {
  const r = parseWeekNote('vegan week, no mushrooms, £80 budget for 4 people, wednesday off', DEFAULT_PREFS, 'us')
  assert.equal(r.locale, 'uk')
  assert.equal(r.prefs.budget, 80)
  assert.ok(r.prefs.avoid.includes('meat') && r.prefs.avoid.includes('dairy') && r.prefs.avoid.includes('mushroom'))
})
