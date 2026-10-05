import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_PREFS } from '../lib/pomme/plan.ts'
import { defaultState, parsePersisted } from '../lib/pomme/persist.ts'

const good = { version: 1, locale: 'uk', prefs: DEFAULT_PREFS, planPrefs: null, seed: 3, swaps: {}, savedAt: Date.now() }

test('restores a valid saved week', () => {
  assert.equal(parsePersisted(JSON.stringify(good))?.seed, 3)
})
test('corrupt JSON falls back to null instead of throwing', () => {
  assert.equal(parsePersisted('{not json'), null)
  assert.equal(parsePersisted(JSON.stringify({ ...good, prefs: 'x' })), null)
})
test('wrong version or older than 90 days is ignored', () => {
  assert.equal(parsePersisted(JSON.stringify({ ...good, version: 2 })), null)
  assert.equal(parsePersisted(JSON.stringify({ ...good, savedAt: Date.now() - 91 * 86_400_000 })), null)
})

test('locale defaults: a UK week starts at £70, a US week at $90', () => {
  assert.equal(defaultState('uk').prefs.budget, 70)
  assert.equal(defaultState('us').prefs.budget, 90)
})

test('saved swaps survive the round-trip', () => {
  const state = parsePersisted(JSON.stringify({ ...good, swaps: { 2: 'chickpea-curry' } }))
  assert.deepEqual(state?.swaps, { 2: 'chickpea-curry' })
})
test('saves from before the swaps field still load with an empty swap map', () => {
  const legacy = { version: 1, locale: 'us', prefs: DEFAULT_PREFS, planPrefs: null, seed: 1, savedAt: Date.now() }
  assert.deepEqual(parsePersisted(JSON.stringify(legacy))?.swaps, {})
})
test('malformed swap maps are dropped, not trusted', () => {
  assert.deepEqual(parsePersisted(JSON.stringify({ ...good, swaps: { 9: 'x' } }))?.swaps, {})
  assert.deepEqual(parsePersisted(JSON.stringify({ ...good, swaps: { 1: 42 } }))?.swaps, {})
  assert.deepEqual(parsePersisted(JSON.stringify({ ...good, swaps: [1, 2] }))?.swaps, {})
  assert.deepEqual(parsePersisted(JSON.stringify({ ...good, swaps: { '-1': 'x' } }))?.swaps, {})
  assert.deepEqual(parsePersisted(JSON.stringify({ ...good, swaps: { 0: 'a'.repeat(80) } }))?.swaps, {})
})
