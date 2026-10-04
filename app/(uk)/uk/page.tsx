import type { Metadata } from 'next'
import { Home } from '@/components/pomme/home'

export const metadata: Metadata = {
  alternates: { canonical: '/uk', languages: { 'en-US': '/', 'en-GB': '/uk', 'x-default': '/' } },
  openGraph: { url: '/uk', locale: 'en_GB', alternateLocale: ['en_US'] },
}

export default function UkPage() {
  return <Home defaultLocale="uk" />
}
