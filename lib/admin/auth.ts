import { createHash, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const ADMIN_COOKIE = 'pomme_admin'

export const hashToken = (token: string) => createHash('sha256').update(`pomme-admin:${token}`).digest('hex')

export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(hashToken(a))
  const bb = Buffer.from(hashToken(b))
  return timingSafeEqual(ba, bb)
}

export const isDevAutoLogin = () => process.env.NODE_ENV === 'development'

export async function isAdmin(): Promise<boolean> {
  if (isDevAutoLogin()) return true
  const token = process.env.ADMIN_TOKEN
  if (!token) return false
  const value = (await cookies()).get(ADMIN_COOKIE)?.value
  return !!value && value === hashToken(token)
}
