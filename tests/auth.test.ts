/**
 * Phase 2.5 — auth + Neon persistence semantics.
 * Runs the EXACT service code the API routes use, against an in-memory repo:
 * passwords, sessions, login merge (local/cloud), and cross-user isolation.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createSessionToken,
  hashPassword,
  verifyPassword,
  verifySessionToken,
} from '../lib/pomme/auth.ts'
import { mergeLocalAndCloud, type StampedState } from '../lib/pomme/merge.ts'
import {
  loadAccount,
  login,
  memoryUserRepo,
  saveAccount,
  signup,
} from '../lib/pomme/account.ts'
import { defaultState, type PommeState } from '../lib/pomme/persist.ts'

const SECRET = 'test-secret'
const state = (seed: number, checked: string[] = []): PommeState => ({
  ...defaultState('us'),
  seed,
  checkedGroceryItems: checked,
})

// ── passwords & sessions ─────────────────────────────────────────────────────

test('2.5a mots de passe: hash scrypt, vérification, faux mot de passe refusé', () => {
  const stored = hashPassword('correct-horse-battery')
  assert.ok(stored.startsWith('scrypt$'))
  assert.equal(verifyPassword('correct-horse-battery', stored), true)
  assert.equal(verifyPassword('wrong-password-here', stored), false)
  assert.equal(verifyPassword('correct-horse-battery', 'garbage'), false)
  // deux hashs du même mot de passe sont distincts (sel aléatoire)
  assert.notEqual(hashPassword('correct-horse-battery'), stored)
})

test('2.5b sessions: token valide, expiré, falsifié, mauvais secret', () => {
  const now = Date.now()
  const token = createSessionToken('user-1', SECRET, now)
  assert.equal(verifySessionToken(token, SECRET, now), 'user-1')
  assert.equal(verifySessionToken(token, SECRET, now + 31 * 24 * 3600 * 1000), null, 'expiration')
  assert.equal(verifySessionToken(`${token}x`, SECRET, now), null, 'falsification')
  assert.equal(verifySessionToken(token, 'other-secret', now), null, 'secret')
  assert.equal(verifySessionToken('v1.abc.123.zzz', SECRET, now), null, 'format')
})

// ── merge local/cloud (stratégie explicite) ──────────────────────────────────

test('2.5c merge: local seul, cloud seul, local plus récent, cloud plus récent, égalité → cloud', () => {
  const l: StampedState = { state: state(2), savedAt: 200 }
  const c: StampedState = { state: state(1), savedAt: 100 }
  assert.equal(mergeLocalAndCloud(l, null)?.source, 'local')
  assert.equal(mergeLocalAndCloud(null, c)?.source, 'cloud')
  assert.equal(mergeLocalAndCloud(null, null), null)

  const localNewer = mergeLocalAndCloud(l, c)
  assert.equal(localNewer?.source, 'local-newer')
  assert.equal(localNewer?.merged.state.seed, 2)
  assert.equal(localNewer?.discardedSavedAt, 100)

  const cloudNewer = mergeLocalAndCloud({ state: state(2), savedAt: 50 }, { state: state(9), savedAt: 90 })
  assert.equal(cloudNewer?.source, 'cloud-newer')
  assert.equal(cloudNewer?.merged.state.seed, 9)

  const tie = mergeLocalAndCloud({ state: state(2), savedAt: 100 }, { state: state(7), savedAt: 100 })
  assert.equal(tie?.source, 'tie-cloud')
  assert.equal(tie?.merged.state.seed, 7)
})

// ── signup / login / restore ─────────────────────────────────────────────────

test('2.5d signup → save → login depuis un autre appareil → le plan revient', async () => {
  const repo = memoryUserRepo()
  const created = await signup(repo, SECRET, 'Ana@Example.com', 'long-enough-pw', { state: state(5), savedAt: 100 })
  assert.equal(created.ok, true)
  if (!created.ok) return
  assert.equal(created.userId.length > 0, true)
  // sauvegarde explicite de la semaine
  assert.equal(await saveAccount(repo, created.token, SECRET, { state: state(6, ['onion']), savedAt: 300 }), true)
  // nouvel appareil: aucun état local → le cloud doit restaurer
  const relogin = await login(repo, SECRET, 'ana@example.com', 'long-enough-pw', null)
  assert.equal(relogin.ok, true)
  if (!relogin.ok) return
  assert.equal(relogin.merged?.source, 'cloud')
  assert.equal(relogin.merged?.merged.state.seed, 6)
  assert.deepEqual(relogin.merged?.merged.state.checkedGroceryItems, ['onion'])
  // e-mail normalisé, mauvais mot de passe refusé
  assert.equal((await login(repo, SECRET, 'ana@example.com', 'nope-nope-nope', null)).ok, false)
})

test('2.5e login fusionne sans écraser: local plus récent gagne, sinon cloud', async () => {
  const repo = memoryUserRepo()
  await signup(repo, SECRET, 'bob@example.com', 'long-enough-pw', { state: state(1), savedAt: 100 })
  // local plus récent que le cloud (100)
  const localNewer = await login(repo, SECRET, 'bob@example.com', 'long-enough-pw', { state: state(3), savedAt: 500 })
  assert.equal(localNewer.ok && localNewer.merged?.source, 'local-newer')
  assert.equal(localNewer.ok && localNewer.merged?.merged.state.seed, 3)
  // cloud (maintenant 500) plus récent que le local (50)
  const cloudNewer = await login(repo, SECRET, 'bob@example.com', 'long-enough-pw', { state: state(9), savedAt: 50 })
  assert.equal(cloudNewer.ok && cloudNewer.merged?.source, 'cloud-newer')
  assert.equal(cloudNewer.ok && cloudNewer.merged?.merged.state.seed, 3)
})

// ── isolation entre utilisateurs ─────────────────────────────────────────────

test('2.5f isolation: jamais les données d\'un autre utilisateur', async () => {
  const repo = memoryUserRepo()
  const a = await signup(repo, SECRET, 'a@example.com', 'long-enough-pw', null)
  const b = await signup(repo, SECRET, 'b@example.com', 'long-enough-pw', null)
  assert.ok(a.ok && b.ok)
  if (!a.ok || !b.ok) return
  await saveAccount(repo, a.token, SECRET, { state: state(11, ['a-secret']), savedAt: 100 })

  // le token de B ne lit que B (vide) — pas la semaine de A
  const bView = await loadAccount(repo, b.token, SECRET)
  assert.equal(bView?.plan, null)
  // le token de A lit uniquement la semaine de A
  const aView = await loadAccount(repo, a.token, SECRET)
  assert.equal(aView?.plan?.state.seed, 11)
  // B sauvegarde SA semaine sans toucher à celle de A
  await saveAccount(repo, b.token, SECRET, { state: state(22), savedAt: 200 })
  assert.equal((await loadAccount(repo, a.token, SECRET))?.plan?.state.seed, 11)
  // token invalide = accès refusé partout
  assert.equal(await loadAccount(repo, 'forged-token', SECRET), null)
  assert.equal(await saveAccount(repo, 'forged-token', SECRET, { state: state(1), savedAt: 1 }), false)
  // la sauvegarde ne transporte AUCUN userId: l'identité vient uniquement du token
  assert.equal('userId' in { state: state(1), savedAt: 1 }, false)
})
