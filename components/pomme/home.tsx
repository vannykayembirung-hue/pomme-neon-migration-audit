import type { Locale } from '@/lib/pomme/recipes'
import { FEATURES } from '@/lib/pomme/features'
import { FAQS, PRICES } from '@/lib/pomme/content'
import { FinalCta, SiteFooter } from '@/components/pomme/closing'
import { Faq } from '@/components/pomme/faq'
import { Hero } from '@/components/pomme/hero'
import { Newsletter } from '@/components/pomme/newsletter'
import { Paywall } from '@/components/pomme/paywall'
import { PommeLearns } from '@/components/pomme/pomme-learns'
import { PommeProvider } from '@/components/pomme/pomme-provider'
import { Pricing } from '@/components/pomme/pricing'
import { SiteHeader } from '@/components/pomme/site-header'
import { SundayPlan } from '@/components/pomme/sunday-plan/sunday-plan'
import { SundayRitual } from '@/components/pomme/sunday-ritual'

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Pomme',
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Web',
      description:
        'A personal weekly planner that plans your dinners, writes your grocery list and keeps your food shop on budget, learning your rhythm week by week.',
      offers: [
        { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
        { '@type': 'Offer', name: 'Pomme Plus', price: String(PRICES.us.monthly), priceCurrency: 'USD' },
        { '@type': 'Offer', name: 'Pomme Annual', price: String(PRICES.us.annual), priceCurrency: 'USD' },
        { '@type': 'Offer', name: 'Pomme Plus', price: String(PRICES.uk.monthly), priceCurrency: 'GBP' },
        { '@type': 'Offer', name: 'Pomme Annual', price: String(PRICES.uk.annual), priceCurrency: 'GBP' },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ],
}

export function Home({ defaultLocale }: { defaultLocale: Locale }) {
  return (
    <PommeProvider defaultLocale={defaultLocale}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <a
        href="#main"
        className="sr-only z-[100] rounded-xl bg-cream px-4 py-2 font-bold text-oxblood focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <SundayRitual />
        <PommeLearns />
        <SundayPlan />
        <Pricing />
        <Faq />
        {FEATURES.newsletterCapture && <Newsletter />}
        <FinalCta />
      </main>
      <SiteFooter />
      {FEATURES.paywallVisible && <Paywall />}
    </PommeProvider>
  )
}
