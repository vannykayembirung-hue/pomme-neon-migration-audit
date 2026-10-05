import { NextResponse } from 'next/server'
import { SESSION_COOKIE, clearCookieOptions } from '@/lib/pomme/api-session'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', clearCookieOptions)
  return response
}
