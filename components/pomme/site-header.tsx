'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Logo } from './logo'
import { LocaleToggle } from './locale-toggle'

const NAV = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#sunday-plan', label: 'Try it' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
]

/**
 * Phase 2.7 — account visibility: "Log in" is reachable from every screen.
 * Signed in → the pair becomes a quiet "Account" pill. Same calm, editorial tone.
 */
export function SiteHeader() {
  const pathname = usePathname()
  const accountHref = pathname?.startsWith('/uk') ? '/uk/account' : '/account'
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    let live = true
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d?.ok) setSignedIn(true)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-oxblood/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <a href="#top" aria-label="Pomme home" className="text-cream">
          <Logo />
        </a>
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-7 text-sm text-cream/75">
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="transition-colors hover:text-cream">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2.5 sm:gap-3">
          {signedIn ? (
            <a
              href={accountHref}
              className="inline-flex items-center rounded-full border border-cream/40 px-3.5 py-1.5 text-sm font-semibold text-cream transition hover:bg-cream/10"
            >
              Account
            </a>
          ) : (
            <>
              <a href={accountHref} className="text-sm font-semibold text-cream/80 transition hover:text-cream">
                Log in
              </a>
              <a
                href={accountHref}
                className="hidden rounded-full border border-cream/40 px-3.5 py-1.5 text-sm font-semibold text-cream transition hover:bg-cream/10 sm:inline-flex"
              >
                Get started
              </a>
            </>
          )}
          <LocaleToggle tone="dark" />
          <a
            href="#sunday-plan"
            className="hidden rounded-full bg-apple px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110 sm:inline-flex"
          >
            Plan my week
          </a>
        </div>
      </div>
    </header>
  )
}
