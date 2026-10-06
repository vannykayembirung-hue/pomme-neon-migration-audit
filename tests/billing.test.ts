/**
 * Phase 2.9 — billing semantics: prepaid windows, trial, webhook authenticity.
 * Pure logic only (lib/billing/plus.ts + saspay signature check).
 */
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { test } from 'node:test'
import { PLAN_DAYS, TRIAL_DAYS, extendPlus, isPlus } from '../lib/billing/plus.ts'
import { verifyWebhookSignature } from '../lib/billing/saspay.ts'

const DAY = 24 * 60 * 60 * 1000

test('isPlus: only a future expiry counts', () => {
  assert.equal(isPlus(null), false)
  assert.equal(isPlus(undefined), false)
  assert.equal(isPlus(new Date(Date.now() - 1000)), false)
  assert.equal(isPlus(new Date(Date.now() + 1000)), true)
})

test('extendPlus: buying early stacks onto the current expiry', () => {
  const future = new Date(Date.now() + 10 * DAY)
  const extended = extendPlus(future, PLAN_DAYS.monthly)
  assert.ok(Math.abs(extended.getTime() - (future.getTime() + 30 * DAY)) < 1000)
})

test('extendPlus: lapsed accounts restart from now', () => {
  const past = new Date(Date.now() - 5 * DAY)
  const extended = extendPlus(past, PLAN_DAYS.annual)
  assert.ok(Math.abs(extended.getTime() - (Date.now() + 365 * DAY)) < 1000)
})

test('trial is 7 days; monthly 30; annual 365', () => {
  assert.equal(TRIAL_DAYS, 7)
  assert.equal(PLAN_DAYS.monthly, 30)
  assert.equal(PLAN_DAYS.annual, 365)
})

test('webhook signature: valid HMAC over timestamp.body', () => {
  const secret = 'whsec_test'
  const body = '{"event":"transaction.success","data":{}}'
  const ts = String(Math.floor(Date.now() / 1000))
  const sig = crypto.createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex')
  assert.equal(verifyWebhookSignature(body, sig, ts, secret), true)
  assert.equal(verifyWebhookSignature(body, sig, ts, 'wrong-secret'), false)
  assert.equal(verifyWebhookSignature(body + 'x', sig, ts, secret), false)
})

test('webhook signature: stale timestamps are rejected', () => {
  const secret = 'whsec_test'
  const body = '{}'
  const ts = String(Math.floor(Date.now() / 1000) - 3600)
  const sig = crypto.createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex')
  assert.equal(verifyWebhookSignature(body, sig, ts, secret), false)
})
