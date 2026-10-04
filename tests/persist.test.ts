import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_PREFS } from '../lib/pomme/plan.ts'
import { parsePersisted } from '../lib/pomme/persist.ts'

const good = { version: 1, locale: 'uk', prefs: DEFAULT_PREFS, planPrefs: null, seed: 3, savedAt: Date.now() }

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
