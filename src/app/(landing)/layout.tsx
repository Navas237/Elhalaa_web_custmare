import type { Viewport } from 'next'
import { Noto_Kufi_Arabic } from 'next/font/google'
import './site/landing.css'

const kufi = Noto_Kufi_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700', '800', '900'],
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2A1238',
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={kufi.className}>
      <body>{children}</body>
    </html>
  )
}
