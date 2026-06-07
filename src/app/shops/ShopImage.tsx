'use client'

import Image from 'next/image'
import { Scissors } from 'lucide-react'
import { useState } from 'react'

type ShopImageProps = {
  src: string | null
  alt: string
}

const BROKEN_IMAGE_IDS = ['photo-1615996001375-9684c3f6b4bd']

export function ShopImage({ src, alt }: ShopImageProps) {
  const [failed, setFailed] = useState(false)
  const isKnownBrokenImage = BROKEN_IMAGE_IDS.some((id) => src?.includes(id))

  if (!src || failed || isKnownBrokenImage) {
    return <Scissors className="w-7 h-7 text-white" aria-hidden="true" />
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover rounded-xl"
      sizes="56px"
      onError={() => setFailed(true)}
    />
  )
}
