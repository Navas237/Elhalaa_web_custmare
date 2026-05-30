'use client'

import Image from 'next/image'
import { Scissors } from 'lucide-react'
import { useState } from 'react'

type ShopImageProps = {
  src: string | null
  alt: string
}

export function ShopImage({ src, alt }: ShopImageProps) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
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
