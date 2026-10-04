'use client'

import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { OPEN_CONSENT_EVENT } from '@/components/consent/cookie-banner'
import { SOCIALS } from '@/lib/site'
import { Logo } from './logo'
import { usePomme } from './pomme-provider'

export function FinalCta() {
  return (
    <section aria-labelledby="final-title" className="relative overflow-hidden bg-oxblood py-24 text-cream sm:py-32">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(45%_60%_at_50%_100%,#5a1019_0%,transparent_75%)]"
      />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-5 text-center">
        <Image
          src="/images/hero-apple.webp"
          alt=""
          width={1024}
          height={1024}
          sizes="224px"
          className="pomme-float w-44 [mask-image:radial-gradient(closest-side,black_65%,transparent)] sm:w-56"
        />
        <h2 id="final-title" className="-mt-4 text-5xl font-black lowercase leading-[0.85] tracking-[-0.05em] sm:text-7xl">
          sunday,
          <span className="block font-script text-[1.5em] font-normal normal-case leading-[0.8] tracking-normal text-leaf">
            sorted.
          </span>
        </h2>
        <p className="mt-6 max-w-md text-pretty text-lg text-cream/75">
          Give Pomme one minute this Sunday. Get your whole week back.
        </p>
        <a
          href="#sunday-plan"
          className="mt-8 inline-flex h-13 items-center gap-2 rounded-2xl bg-apple px-7 py-4 font-bold text-primary-foreground shadow-[0_14px_30px_-12px_rgba(214,42,51,0.8)] transition hover:brightness-110"
        >
          Make my Sunday Plan
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  )
}

function ResetWeek() {
  const { resetWeek } = usePomme()
  return (
    <button
      type="button"
      onClick={() => {
        if (window.confirm('Clear your saved week from this device?')) resetWeek()
      }}
      className="text-cream/60 underline-offset-4 hover:text-cream hover:underline"
    >
      Reset my week
    </button>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-oxblood text-cream/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Logo className="text-cream" />
          <p className="text-sm">Your week, beautifully sorted.</p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li>
              <a href="#how-it-works" className="hover:text-cream">
                How it works
              </a>
            </li>
            <li>
              <a href="#pricing" className="hover:text-cream">
                Pricing
              </a>
            </li>
            <li>
              <a href="#faq" className="hover:text-cream">
                FAQ
              </a>
            </li>
          </ul>
        </nav>
        <p className="text-xs">© 2026 Pomme. Made for real weeks, in the US and UK.</p>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 border-t border-white/10 px-5 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Pomme on social media">
          {SOCIALS.map((s) => (
            <li key={s.name}>
              <a href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-cream">
                {s.name}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <li>
            <a href="/do-not-sell" className="underline-offset-4 hover:text-cream hover:underline">
              Do Not Sell or Share My Personal Information
            </a>
          </li>
          <li>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
              className="underline-offset-4 hover:text-cream hover:underline"
            >
              Cookie settings
            </button>
          </li>
          <li>
            <ResetWeek />
          </li>
        </ul>
      </div>
    </footer>
  )
}
