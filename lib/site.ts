export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3000'

export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? 'dev'

export const CONTACT_EMAIL = 'infos.pomme@gmail.com'

export const SOCIALS = [
  { name: 'Instagram', href: 'https://www.instagram.com/pomme' },
  { name: 'TikTok', href: 'https://www.tiktok.com/@pomme' },
  { name: 'X', href: 'https://x.com/pomme' },
  { name: 'Bluesky', href: 'https://bsky.app/profile/pomme.bsky.social' },
  { name: 'YouTube', href: 'https://www.youtube.com/@pomme' },
  { name: 'Substack', href: 'https://pomme.substack.com' },
] as const
