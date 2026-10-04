'use client'

import { Check, Copy, Mail, MessageCircle, MessageSquare, Share2, X as CloseIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { track } from '@/lib/telemetry'
import { usePomme } from './pomme-provider'

const MESSAGE = 'Try Pomme for your week'

export function ShareButton() {
  const { locale } = usePomme()
  const ref = useRef<HTMLDialogElement>(null)
  const [copied, setCopied] = useState(false)

  const url = () => {
    const u = new URL(locale === 'uk' ? '/uk' : '/', window.location.origin)
    u.searchParams.set('utm_source', 'share')
    return u.toString()
  }

  const record = (channel: string) => track({ type: 'share', locale, channel })
  const open = (href: string, channel: string) => {
    record(channel)
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url())
      setCopied(true)
      record('copy')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const item =
    'flex items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold hover:bg-oxblood/5 focus-visible:outline-2 focus-visible:outline-oxblood'

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cream underline-offset-4 hover:underline"
      >
        <Share2 className="size-4" aria-hidden="true" />
        Share your Sunday
      </button>
      <dialog
        ref={ref}
        aria-labelledby="share-title"
        onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl bg-cream p-5 text-oxblood shadow-2xl backdrop:bg-oxblood/70"
      >
        <div className="flex items-center justify-between">
          <h2 id="share-title" className="text-xl font-black">
            Share your Sunday
          </h2>
          <button type="button" aria-label="Close" onClick={() => ref.current?.close()} className="rounded-full p-2 hover:bg-oxblood/5">
            <CloseIcon className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-3 flex flex-col">
          <button type="button" onClick={copy} className={item}>
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? 'Link copied' : 'Copy link'}
          </button>
          <button
            type="button"
            onClick={() => open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(MESSAGE)}&url=${encodeURIComponent(url())}`, 'x')}
            className={item}
          >
            <Share2 className="size-4" aria-hidden="true" />
            Share to X
          </button>
          <button
            type="button"
            onClick={() => open(`https://wa.me/?text=${encodeURIComponent(`${MESSAGE} ${url()}`)}`, 'whatsapp')}
            className={item}
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            WhatsApp
          </button>
          <a
            href={`sms:?&body=${encodeURIComponent(`${MESSAGE} ${typeof window === 'undefined' ? '' : url()}`)}`}
            onClick={() => record('sms')}
            className={item}
          >
            <MessageSquare className="size-4" aria-hidden="true" />
            Text message
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent(MESSAGE)}&body=${encodeURIComponent(typeof window === 'undefined' ? '' : url())}`}
            onClick={() => record('email')}
            className={item}
          >
            <Mail className="size-4" aria-hidden="true" />
            Email
          </a>
        </div>
      </dialog>
    </>
  )
}
