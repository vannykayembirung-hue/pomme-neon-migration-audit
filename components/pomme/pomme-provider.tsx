'use client'

import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from 'react'
import {
  DEFAULT_PREFS,
  generatePlan,
  parseWeekNote,
  type Plan,
  type Prefs,
} from '@/lib/pomme/plan'
import { FEATURES } from '@/lib/pomme/features'
import { createPommeStore, localiseState } from '@/lib/pomme/persist'
import type { Locale } from '@/lib/pomme/recipes'
import { track } from '@/lib/telemetry'

export type PaywallReason = 'swap' | 'save' | 'budget' | 'next-week' | 'pricing'

type PommeContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  prefs: Prefs
  setPrefs: (update: (prev: Prefs) => Prefs) => void
  plan: Plan | null
  generate: () => void
  applyWeekNote: (note: string) => void
  resetWeek: () => void
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
  const { locale, prefs, planPrefs, seed } = state

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
    store.update((s) => ({ ...s, planPrefs: s.prefs, seed: s.seed + 1 }))
    track({ type: 'plan_generated', locale, mood: prefs.mood })
  }, [store, locale, prefs.mood])

  const applyWeekNote = useCallback(
    (note: string) => {
      const parsed = parseWeekNote(note, prefs, locale)
      store.update((s) => ({ ...s, locale: parsed.locale, prefs: parsed.prefs, planPrefs: parsed.prefs, seed: s.seed + 1 }))
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

  const openPaywall = useCallback(
    (reason: PaywallReason) => {
      if (!FEATURES.paywallVisible) return
      setPaywall(reason)
      track({ type: 'paywall_open', locale, reason })
    },
    [locale],
  )

  const plan = useMemo(
    () => (seed > 0 ? generatePlan(planPrefs ?? prefs, locale, seed) : null),
    [seed, planPrefs, prefs, locale],
  )

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
      paywall,
      openPaywall,
      closePaywall: () => setPaywall(null),
    }),
    [locale, setLocale, prefs, setPrefs, plan, generate, applyWeekNote, resetWeek, paywall, openPaywall],
  )

  return <PommeContext.Provider value={value}>{children}</PommeContext.Provider>
}

export function usePomme() {
  const ctx = useContext(PommeContext)
  if (!ctx) throw new Error('usePomme must be used inside PommeProvider')
  return ctx
}
