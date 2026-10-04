import type { Metadata, Viewport } from 'next'
import { SITE_URL } from '@/lib/site'

export const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Pomme: Your week, beautifully sorted',
    template: '%s · Pomme',
  },
  description:
    'Tell Pomme how your week looks. She plans your dinners, writes your grocery list and keeps it all on budget, then learns your rhythm week by week.',
  applicationName: 'Pomme',
  keywords: ['weekly meal planner', 'grocery list app', 'meal planning on a budget', 'Sunday reset'],
  alternates: { canonical: '/', languages: { 'en-US': '/', 'en-GB': '/uk', 'x-default': '/' } },
  appleWebApp: { capable: true, title: 'Pomme', statusBarStyle: 'black-translucent' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Pomme',
    title: 'Pomme: Your week, beautifully sorted',
    description:
      'Your dinners, your basket and your budget, planned every Sunday by a planner that actually gets you.',
    locale: 'en_US',
    alternateLocale: ['en_GB'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pomme: Your week, beautifully sorted',
    description: 'Tell Pomme how your week looks. She handles dinner, the shop and the budget.',
  },
  generator: 'v0.app',
}

export const baseViewport: Viewport = {
  themeColor: '#1c0709',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
}
