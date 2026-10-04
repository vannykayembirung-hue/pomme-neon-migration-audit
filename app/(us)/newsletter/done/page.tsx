import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Newsletter', robots: { index: false } }

const COPY: Record<string, { title: string; body: string }> = {
  confirmed: { title: 'You are in.', body: 'Thank you. Your welcome email is on its way, and your first Sunday email follows this weekend.' },
  delayed: {
    title: 'You are in.',
    body: 'Thank you. Our email provider is slow right now, so your welcome email is delayed. We keep retrying and it will arrive. Your Sunday emails are not affected.',
  },
  unsubscribed: { title: 'You are unsubscribed.', body: 'No more emails from us. Come back whenever you like.' },
  slow: { title: 'Too many tries.', body: 'Please wait a minute and use the link in your email again.' },
  invalid: { title: 'That link has expired.', body: 'Try subscribing again from the Pomme homepage and we will send a fresh link.' },
}

export default async function Done({ searchParams }: { searchParams: Promise<{ status?: string; delayed?: string }> }) {
  const { status = 'invalid', delayed } = await searchParams
  const copy = COPY[status === 'confirmed' && delayed ? 'delayed' : status] ?? COPY.invalid
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-cream px-5 text-oxblood">
      <h1 className="text-4xl font-black tracking-tight">{copy.title}</h1>
      <p className="mt-3 text-lg">{copy.body}</p>
      <Link href="/" className="mt-8 font-bold underline underline-offset-4">
        Back to Pomme
      </Link>
    </main>
  )
}
