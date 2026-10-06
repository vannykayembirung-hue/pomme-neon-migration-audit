/**
 * Phase 2.9 — pure Plus logic. No I/O: unit-tested, reused by the entitlement store.
 */

export type Plan = 'monthly' | 'annual'
export const PLAN_DAYS: Record<Plan, number> = { monthly: 30, annual: 365 }
export const TRIAL_DAYS = 7

export function isPlus(plusUntil: Date | null | undefined): boolean {
  return !!plusUntil && plusUntil.getTime() > Date.now()
}

/** Extends from the later of now and the current expiry — buying early never loses days. */
export function extendPlus(from: Date | null, days: number): Date {
  const base = from && from.getTime() > Date.now() ? from.getTime() : Date.now()
  return new Date(base + days * 24 * 60 * 60 * 1000)
}
