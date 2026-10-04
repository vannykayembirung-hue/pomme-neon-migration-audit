import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1c0709' }}>
        <svg width="140" height="140" viewBox="0 0 64 64">
          <path d="M32 21c-4-3-9-3-12.5-1C14 23 12 30 14 37.5 16 46 21.5 53 27 53c2 0 3.2-1 5-1s3 1 5 1c5.5 0 11-7 13-15.5 2-7.5 0-14.5-5.5-17.5C41 18 36 18 32 21z" fill="#d62a33" />
          <path d="M32 22c0-4 1-7 3-9" stroke="#5a2a14" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M34.5 15.5c3-4.5 8-6 12.5-5-1 4.5-5.5 8-12.5 5z" fill="#8cc152" />
        </svg>
      </div>
    ),
    size,
  )
}
