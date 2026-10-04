'use client'

import Image from 'next/image'
import { ShareButton } from './share-button'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Heart, ShoppingBasket } from 'lucide-react'
import { formatMoney } from '@/lib/pomme/plan'
import { usePomme } from './pomme-provider'

const depth = (x: number, y: number, rotate = 0): React.CSSProperties => ({
  transform: `translate3d(calc(var(--px, 0) * ${x}px), calc(var(--py, 0) * ${y}px), 0)${
    rotate ? ` rotate(calc(var(--px, 0) * ${rotate}deg))` : ''
  }`,
  willChange: 'transform',
})

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

const EXAMPLES = {
  us: ['Busy week, two of us, $80', 'Veggie, no cooking Wednesday', 'Family of four, quick Fridays'],
  uk: ['Busy week, two of us, £60', 'Veggie, no cooking Wednesday', 'Family of four, quick Fridays'],
}

function useParallax(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const target = { x: 0, y: 0 }
    const current = { x: 0, y: 0 }
    const impulse = { x: 0, y: 0 }
    let raf = 0
    let visible = true

    const onPointer = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1
      target.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    const onKey = (e: KeyboardEvent) => {
      const dir = ARROWS[e.key] ?? [Math.sin(performance.now()) * 0.6, -0.5]
      impulse.x = Math.max(-1.4, Math.min(1.4, impulse.x + dir[0] * 0.45))
      impulse.y = Math.max(-1.4, Math.min(1.4, impulse.y + dir[1] * 0.45))
    }
    const tick = () => {
      impulse.x *= 0.9
      impulse.y *= 0.9
      current.x += (target.x + impulse.x - current.x) * 0.07
      current.y += (target.y + impulse.y - current.y) * 0.07
      el.style.setProperty('--px', current.x.toFixed(4))
      el.style.setProperty('--py', current.y.toFixed(4))
      if (visible) raf = requestAnimationFrame(tick)
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      cancelAnimationFrame(raf)
      if (visible) raf = requestAnimationFrame(tick)
    })

    observer.observe(el)
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('keydown', onKey)
    raf = requestAnimationFrame(tick)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [ref])
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const { applyWeekNote, locale } = usePomme()
  const [note, setNote] = useState('')
  useParallax(sectionRef)

  const placeholder =
    locale === 'uk' ? 'Late Wednesday, gym Friday, £60 for two…' : 'Late Wednesday, gym Friday, $80 for two…'

  return (
    <section
      id="top"
      ref={sectionRef}
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden bg-oxblood text-cream"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(55%_45%_at_72%_38%,#5a1019_0%,transparent_75%),radial-gradient(40%_35%_at_10%_90%,#3a0a10_0%,transparent_70%)]"
      />
      <div aria-hidden="true" className="absolute -left-16 top-24 -z-10 w-48 opacity-50 blur-[3px] sm:w-64" style={depth(-24, -18, -6)}>
        <Image src="/images/leaf.webp" alt="" width={512} height={512} sizes="256px" className="[mask-image:radial-gradient(closest-side,black_55%,transparent)]" />
      </div>
      <div aria-hidden="true" className="absolute -bottom-20 -right-20 z-20 w-72 opacity-80 blur-[6px] sm:w-96" style={depth(60, 40, 8)}>
        <Image src="/images/leaf.webp" alt="" width={512} height={512} sizes="384px" className="rotate-[140deg] [mask-image:radial-gradient(closest-side,black_55%,transparent)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-20 sm:pt-24 lg:min-h-[100svh] lg:pb-24 lg:pt-36">
        <div
          className="relative mx-auto -mb-[30vw] w-[92vw] max-w-[540px] sm:-mb-52 lg:absolute lg:right-[-3%] lg:top-[46%] lg:mb-0 lg:w-[620px] lg:max-w-none lg:-translate-y-1/2"
        >
          <div style={depth(18, 14, 3)}>
            <Image
              src="/images/hero-apple.webp"
              alt="A glossy red apple with fresh green leaves"
              width={1024}
              height={1024}
              priority
              sizes="(min-width: 1024px) 620px, 92vw"
              className="h-auto w-full [mask-image:radial-gradient(closest-side,black_70%,transparent)]"
            />
          </div>

          <div className="absolute right-0 top-[10%] z-20 sm:right-[2%]" style={depth(-36, -26)}>
            <div className="pomme-float">
              <div className="pomme-pop relative w-44 rounded-2xl bg-apple p-3 shadow-[0_24px_48px_-12px_rgba(214,42,51,0.65)] [animation-delay:400ms] sm:w-56">
                <div className="flex items-center gap-2">
                  <span className="inline-flex size-6 items-center justify-center rounded-full bg-cream text-apple">
                    <Heart className="size-3.5 fill-current" aria-hidden="true" />
                  </span>
                  <span className="text-[11px] font-medium text-cream">Pomme · Sun 6:00 pm</span>
                </div>
                <p className="mt-2 text-sm font-bold leading-tight sm:text-base">Your week is ready.</p>
                <p className="mt-0.5 text-xs text-cream">
                  5 dinners · 1 basket · {formatMoney(locale === 'uk' ? 54 : 68, locale)}
                </p>
                <span aria-hidden="true" className="absolute -bottom-1.5 left-8 size-4 rotate-45 rounded-sm bg-apple" />
              </div>
            </div>
          </div>

          <div className="absolute bottom-[14%] right-[6%] z-20 hidden sm:block" style={depth(-52, 30)}>
            <div className="pomme-pop flex items-center gap-2.5 rounded-2xl bg-cream px-3 py-2.5 text-oxblood shadow-2xl [animation-delay:900ms]">
              <span className="inline-flex size-8 items-center justify-center rounded-xl bg-leaf-deep text-cream">
                <ShoppingBasket className="size-4" aria-hidden="true" />
              </span>
              <span className="text-xs leading-tight">
                <span className="block font-bold">23 items</span>
                <span className="text-muted-foreground">sorted by aisle</span>
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 lg:max-w-[52rem]">
          <p className="mb-5 hidden items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1 text-xs font-medium text-cream/80 ring-1 ring-white/10 lg:inline-flex">
            <span className="size-1.5 rounded-full bg-leaf" aria-hidden="true" />
            Your Sunday Plan, every week
          </p>
          <h1
            id="hero-title"
            className="text-[14vw] font-black lowercase leading-[0.84] tracking-[-0.05em] [word-spacing:0.12em] [text-shadow:0_8px_40px_rgba(28,7,9,0.45)] sm:text-[6.5rem] lg:text-[7.75rem]"
          >
            <span className="block whitespace-nowrap">your week,</span>
            <span className="block whitespace-nowrap">beautifully</span>
            <span
              className="-mt-[1vw] block -rotate-6 pl-[28%] font-script text-[28vw] font-normal [word-spacing:normal] normal-case leading-[0.7] tracking-normal text-leaf sm:text-[10rem] lg:-mt-2 lg:pl-[34%] lg:text-[12rem]"
              style={depth(-14, -8)}
            >
              sorted
            </span>
          </h1>

          <div className="mt-6 max-w-xl lg:mt-4">
            <p className="text-pretty text-lg leading-relaxed text-cream/80 sm:text-xl">
              Tell Pomme how your week looks. She tells you what to eat, what to buy, and how to make it all feel a
              little easier.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                applyWeekNote(note)
              }}
              className="mt-7 rounded-2xl bg-white/[0.06] p-1.5 ring-1 ring-white/15 backdrop-blur-md focus-within:ring-leaf/60"
            >
              <label htmlFor="week-note" className="sr-only">
                Tell Pomme how your week looks
              </label>
              <div className="flex flex-col gap-1.5 sm:flex-row">
                <input
                  id="week-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={placeholder}
                  autoComplete="off"
                  className="h-12 min-w-0 flex-1 bg-transparent px-3.5 text-base text-cream outline-none placeholder:text-cream/45"
                />
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-apple px-5 font-semibold text-primary-foreground transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
                >
                  Plan my week
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            </form>
            <ShareButton />

            <div className="mt-4 flex flex-wrap gap-2" aria-label="Try an example">
              {EXAMPLES[locale].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setNote(example)
                    applyWeekNote(example)
                  }}
                  className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-cream/75 transition hover:border-leaf/60 hover:text-cream"
                >
                  {example}
                </button>
              ))}
            </div>
            <p className="mt-5 text-xs text-cream/55">Free to try. No card, no account, about 30 seconds.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
