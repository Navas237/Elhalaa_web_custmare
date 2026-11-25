import type { Metadata, Viewport } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import { Scissors, Menu } from 'lucide-react'
import BottomNavigation from './BottomNavigation'
import HeaderAuth from './HeaderAuth'
import { getTenant } from '@/utils/tenant'

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-cairo',
  display: 'swap', // prevent FOIT
})

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant()
  return {
    title: `${tenant.name} — احجز موعدك`,
    description: tenant.branding.description || `${tenant.name} للحلاقة. اختر حلاقك وحدد موعدك بكل سهولة.`,
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#E8192C',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenant()

  return (
    <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --color-brand: ${tenant.branding.primary_color || '#E8192C'};
            }
          `
        }} />
      </head>
      <body
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: 'var(--color-bg-page)' }}
      >
        {/* ── Top Navbar (desktop + mobile header) ── */}
        <header
          className="sticky top-0 z-50 bg-white border-b"
          style={{ borderColor: 'var(--color-gray-200)' }}
        >
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            {/* Logo & Tenant Name */}
            <Link href="/" className="flex items-center gap-2 cursor-pointer">
              {tenant.branding.logo_url ? (
                <img
                  src={tenant.branding.logo_url}
                  alt={tenant.name}
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))' }}
                >
                  <Scissors className="w-4 h-4 text-white" />
                </div>
              )}
              <span
                className="font-bold text-base leading-none hidden sm:block"
                style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-gray-900)' }}
              >
                {tenant.name}
              </span>
            </Link>

            {/* User-dependent nav — client-side session, never blocks */}
            <div className="flex items-center gap-2">
              <HeaderAuth />

              {/* Mobile menu button — static */}
              <button
                type="button"
                data-testid="mobile-menu-toggle"
                aria-label="القائمة"
                className="sm:hidden w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ color: 'var(--color-gray-600)', backgroundColor: 'var(--color-gray-100)' }}
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* ── Page content — bottom padding on mobile for the nav bar ── */}
        <main className="flex-1 pb-20 sm:pb-0">
          {children}
        </main>

        {/* ── Desktop Footer ── */}
        <footer
          className="hidden sm:block border-t text-center py-5 text-sm"
          style={{ borderColor: 'var(--color-gray-200)', color: 'var(--color-gray-400)' }}
        >
          © {new Date().getFullYear()} {tenant.name}
        </footer>

        {/* ── Mobile Bottom Navigation — client-side session, never blocks ── */}
        <BottomNavigation />
      </body>
    </html>
  )
}

