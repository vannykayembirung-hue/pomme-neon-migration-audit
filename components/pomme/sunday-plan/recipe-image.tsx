'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Recipe photo with a graceful styled fallback while a few photos are still
 * being generated — never a broken image box.
 */
export function RecipeImage({
  src,
  alt,
  width,
  height,
  sizes,
  className,
}: {
  src: string
  alt: string
  width: number
  height: number
  sizes: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn('bg-[linear-gradient(135deg,#f4e9dc_0%,#e8c9b0_55%,#c4574f_100%)]', className)}
      />
    )
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}
