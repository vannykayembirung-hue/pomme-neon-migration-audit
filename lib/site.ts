export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3000'

export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? 'dev'

export const CONTACT_EMAIL = 'infos.pomme@gmail.com'

// Only list accounts Pomme actually owns; the footer hides this list while it is empty.
export const SOCIALS: ReadonlyArray<{ name: string; href: string }> = []
