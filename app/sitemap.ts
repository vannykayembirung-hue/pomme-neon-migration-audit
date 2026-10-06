import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

const CONTENT = [
  'mealime-alternative',
  'platejoy-alternative',
  'best-sunday-meal-planner-2026',
  'weekly-meal-planner-with-grocery-list',
  'meal-planning-for-beginners',
  'meal-plan-on-a-budget',
  'meal-planner-for-busy-families',
  'sunday-reset-routine',
  'eat-this-much-alternative',
  'how-to-reduce-food-waste',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = { 'en-US': SITE_URL, 'en-GB': `${SITE_URL}/uk` }
  const lastModified = new Date()
  return [
    { url: SITE_URL, lastModified, changeFrequency: 'weekly', priority: 1, alternates: { languages } },
    { url: `${SITE_URL}/uk`, lastModified, changeFrequency: 'weekly', priority: 1, alternates: { languages } },
    ...CONTENT.map((slug) => ({
      url: `${SITE_URL}/${slug}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
