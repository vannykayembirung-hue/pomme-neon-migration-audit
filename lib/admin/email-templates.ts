import { SITE_URL } from '@/lib/site'

export const POSTAL_ADDRESS =
  process.env.POMME_POSTAL_ADDRESS ?? 'Pomme Ltd, [registered address], United Kingdom and United States'

import type { Mail } from './email'

const listHeaders = (token: string) => ({
  'List-Unsubscribe': `<${SITE_URL}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
})

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

function shell(body: string, unsubscribeUrl?: string) {
  const footer = `${esc(POSTAL_ADDRESS)}${unsubscribeUrl ? ` · <a href="${esc(unsubscribeUrl)}" style="color:#6b3b3f">Unsubscribe</a>` : ''}`
  return `<!doctype html><html lang="en"><body style="margin:0;background:#fbf3e8;font-family:Arial,Helvetica,sans-serif;color:#1c0709"><div style="max-width:520px;margin:0 auto;padding:32px 24px">${body}<p style="margin-top:32px;font-size:12px;line-height:1.5;color:#6b3b3f">${footer}</p></div></body></html>`
}

const button = (href: string, label: string) =>
  `<p style="margin:28px 0"><a href="${esc(href)}" style="background:#1c0709;color:#fbf3e8;padding:14px 22px;border-radius:12px;text-decoration:none;font-weight:bold;display:inline-block">${esc(label)}</a></p>`

const textFooter = (unsubscribeUrl?: string) => `\n\n${POSTAL_ADDRESS}${unsubscribeUrl ? `\nUnsubscribe: ${unsubscribeUrl}` : ''}`

export function confirmEmail(token: string): Mail {
  const url = `${SITE_URL}/newsletter/confirm?token=${encodeURIComponent(token)}`
  return {
    subject: 'Confirm your Sunday with Pomme',
    html: shell(
      `<h1 style="font-size:24px">Confirm your Sunday with Pomme</h1><p style="line-height:1.6">Once you confirm, we&rsquo;ll send one quiet email on Sunday mornings with a plan for the week ahead. Nothing else, and you can stop whenever you like.</p>${button(url, 'Yes, send me Sunday')}<p style="font-size:14px;line-height:1.6">If you didn&rsquo;t ask for this, ignore this email and we&rsquo;ll forget your address within 48 hours.</p>`,
    ),
    text: `Confirm your Sunday with Pomme\n\nOnce you confirm, we'll send one quiet email on Sunday mornings with a plan for the week ahead.\n\nConfirm: ${url}\n\nIf you didn't ask for this, ignore this email and we'll forget your address within 48 hours.${textFooter()}`,
  }
}

export function welcomeEmail(unsubscribeToken: string): Mail {
  const unsub = `${SITE_URL}/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`
  return {
    subject: 'Your first Sunday with Pomme',
    html: shell(
      `<h1 style="font-size:24px">Your first Sunday with Pomme</h1><p style="line-height:1.6">You&rsquo;re in. Whenever you&rsquo;re ready, tell Pomme how your week looks and she&rsquo;ll sort dinner, the shop and the budget.</p>${button(SITE_URL, 'Make my Sunday Plan')}`,
      unsub,
    ),
    headers: listHeaders(unsubscribeToken),
    text: `Your first Sunday with Pomme\n\nYou're in. Whenever you're ready, tell Pomme how your week looks.\n\n${SITE_URL}${textFooter(unsub)}`,
  }
}

export function sundayReminderEmail(unsubscribeToken: string): Mail {
  const unsub = `${SITE_URL}/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`
  return {
    subject: 'Tomorrow is a good day to start a Pomme Sunday',
    html: shell(
      `<h1 style="font-size:24px">Tomorrow is a good day to start a Pomme Sunday</h1><p style="line-height:1.6">One minute tonight and your week is sorted.</p>${button(SITE_URL, 'Open Pomme')}`,
      unsub,
    ),
    headers: listHeaders(unsubscribeToken),
    text: `Tomorrow is a good day to start a Pomme Sunday.\n\nOne minute tonight and your week is sorted.\n${SITE_URL}${textFooter(unsub)}`,
  }
}
