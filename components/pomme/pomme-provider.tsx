'use client'

import { useRouter } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  DEFAULT_PREFS,
  applySwaps,
  findNextSeed,
  generatePlan,
  parseWeekNote,
  planSignature,
  type Plan,
  type Prefs,
} from '@/lib/pomme/plan'
import { FEATURES } from '@/lib/pomme/features'
import { createPommeStore, localiseState } from '@/lib/pomme/persist'
import type { Locale } from '@/lib/pomme/recipes'
import { track } from '@/lib/telemetry'

export type PaywallReason = 'swap' | 'save' | 'budget' | 'next-week' | 'pricing'

/** One real swap per week is free; extra swaps stay behind the Plus paywall. */
export const FREE_SWAPS_PER_WEEK = 1

type PommeContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  prefs: Prefs
  setPrefs: (update: (prev: Prefs) => Prefs) => void
  plan: Plan | null
  generate: () => void
  applyWeekNote: (note: string) => void
  resetWeek: () => void
  swaps: Record<number, string>
  swapMeal: (day: number, recipeId: string) => void
  freeSwapsLeft: number
  /** Grocery checkboxes: ingredient keys ticked while shopping (persisted). */
  checkedGroceryItems: string[]
  toggleGroceryItem: (key: string) => void
  paywall: PaywallReason | null
  openPaywall: (reason: PaywallReason) => void
  closePaywall: () => void
}

const PommeContext = createContext<PommeContextValue | null>(null)

const pathFor = (l: Locale) => (l === 'uk' ? '/uk' : '/')

export function PommeProvider({
  children,
  defaultLocale = 'us',
}: {
  children: React.ReactNode
  defaultLocale?: Locale
}) {
  const store = useMemo(() => createPommeStore(defaultLocale), [defaultLocale])
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
  const [paywall, setPaywall] = useState<PaywallReason | null>(null)
  const { locale, prefs, planPrefs, seed, swaps, checkedGroceryItems } = state

  const router = useRouter()

  // The URL is the locale: switching region saves the converted state, then moves to the matching page.
  const setLocale = useCallback(
    (next: Locale) => {
      store.update((s) => localiseState(s, next))
      if (next !== defaultLocale) router.push(pathFor(next))
    },
    [store, router, defaultLocale],
  )

  const setPrefs = useCallback(
    (update: (prev: Prefs) => Prefs) => store.update((s) => ({ ...s, prefs: update(s.prefs) })),
    [store],
  )

  const generate = useCallback(() => {
    store.update((s) => {
      // "Rework my plan" must visibly rework: skip seeds that reproduce the same week.
      const previous = s.seed > 0 ? planSignature(generatePlan(s.planPrefs ?? s.prefs, locale, s.seed)) : null
      const seed = findNextSeed(s.prefs, locale, s.seed + 1, previous)
      return { ...s, planPrefs: s.prefs, seed, swaps: {} }
    })
    track({ type: 'plan_generated', locale, mood: prefs.mood })
  }, [store, locale, prefs.mood])

  const applyWeekNote = useCallback(
    (note: string) => {
      const parsed = parseWeekNote(note, prefs, locale)
      store.update((s) => {
        const previous = s.seed > 0 ? planSignature(generatePlan(s.planPrefs ?? s.prefs, locale, s.seed)) : null
        const seed = findNextSeed(parsed.prefs, parsed.locale, s.seed + 1, previous)
        return { ...s, locale: parsed.locale, prefs: parsed.prefs, planPrefs: parsed.prefs, seed, swaps: {} }
      })
      track({ type: 'plan_generated', locale: parsed.locale, mood: parsed.prefs.mood })
      if (parsed.locale !== defaultLocale) {
        router.push(pathFor(parsed.locale))
        return
      }
      requestAnimationFrame(() => {
        document.getElementById('sunday-plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    },
    [store, prefs, locale, defaultLocale, router],
  )

  const resetWeek = useCallback(() => {
    store.reset()
    setPaywall(null)
  }, [store])

  const swapMeal = useCallback(
    (day: number, recipeId: string) => {
      store.update((s) => ({ ...s, swaps: { ...s.swaps, [day]: recipeId } }))
      track({ type: 'swap', locale, reason: `day-${day}` })
    },
    [store, locale],
  )

  const toggleGroceryItem = useCallback(
    (key: string) => {
      store.update((s) => ({
        ...s,
        checkedGroceryItems: s.checkedGroceryItems.includes(key)
          ? s.checkedGroceryItems.filter((k) => k !== key)
          : [...s.checkedGroceryItems, key],
      }))
    },
    [store],
  )

  const openPaywall = useCallback(
    (reason: PaywallReason) => {
      if (!FEATURES.paywallVisible) return
      setPaywall(reason)
      track({ type: 'paywall_open', locale, reason })
    },
    [locale],
  )

  const plan = useMemo(
    () =>
      seed > 0
        ? applySwaps(generatePlan(planPrefs ?? prefs, locale, seed), swaps, planPrefs ?? prefs, locale)
        : null,
    [seed, planPrefs, prefs, locale, swaps],
  )

  // Checkboxes follow the current grocery list: when the plan changes (rework,
  // week note, swap), keys that no longer exist are cleaned out; new items start
  // unchecked; surviving keys keep their ticks. resetWeek() clears everything.
  useEffect(() => {
    if (!plan) return
    const keys = new Set<string>()
    for (const group of plan.basket) for (const item of group.items) keys.add(item.key)
    for (const staple of plan.staples) keys.add(staple.key)
    const pruned = checkedGroceryItems.filter((key) => keys.has(key))
    if (pruned.length !== checkedGroceryItems.length) {
      store.update((s) => ({ ...s, checkedGroceryItems: pruned }))
    }
  }, [plan, checkedGroceryItems, store])

  const value = useMemo<PommeContextValue>(
    () => ({
      locale,
      setLocale,
      prefs,
      setPrefs,
      plan,
      generate,
      applyWeekNote,
      resetWeek,
      swaps,
      swapMeal,
      freeSwapsLeft: Math.max(0, FREE_SWAPS_PER_WEEK - Object.keys(swaps).length),
      checkedGroceryItems,
      toggleGroceryItem,
      paywall,
      openPaywall,
      closePaywall: () => setPaywall(null),
    }),
    [locale, setLocale, prefs, setPrefs, plan, generate, applyWeekNote, resetWeek, swaps, swapMeal, checkedGroceryItems, toggleGroceryItem, paywall, openPaywall],
  )

  return <PommeContext.Provider value={value}>{children}</PommeContext.Provider>
}

export function usePomme() {
  const ctx = useContext(PommeContext)
  if (!ctx) throw new Error('usePomme must be used inside PommeProvider')
  return ctx
}
