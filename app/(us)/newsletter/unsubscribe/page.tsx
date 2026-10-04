import type { Metadata } from 'next'
import Link from 'next/link'
import { peekUnsubscribe } from '@/lib/admin/subscribers'
import { confirmUnsubscribe } from '../actions'

export const metadata: Metadata = { title: 'Unsubscribe', robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams
  const valid = await peekUnsubscribe(token)
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-cream px-5 text-oxblood">
      {valid ? (
        <>
          <h1 className="text-4xl font-black tracking-tight">Leave Sunday?</h1>
          <p className="mt-3 text-lg">Confirm below and we will stop emailing you straight away.</p>
          <form action={confirmUnsubscribe} className="mt-8">
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="min-h-12 rounded-xl bg-oxblood px-6 font-bold text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood">
              Unsubscribe me
            </button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-4xl font-black tracking-tight">Nothing to unsubscribe.</h1>
          <p className="mt-3 text-lg">This link is invalid, or you have already unsubscribed.</p>
        </>
      )}
      <Link href="/" className="mt-8 font-bold underline underline-offset-4">
        Back to Pomme
      </Link>
    </main>
  )
}
