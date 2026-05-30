import type { Metadata, Viewport } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Scissors, Home, Store, CalendarCheck, User } from 'lucide-react'

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-cairo',
  display: 'swap', // prevent FOIT
})

export const metadata: Metadata = {
  title: 'The Digital Atelier — احجز موعدك',
  description: 'منصة حجز صالونات الحلاقة. اختر حلاقك وحدد موعدك بكل سهولة.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#E8192C',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
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
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 cursor-pointer">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))' }}
              >
                <Scissors className="w-4 h-4 text-white" />
              </div>
              <span
                className="font-bold text-base leading-none hidden sm:block"
                style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-gray-900)' }}
              >
                The Digital Atelier
              </span>
            </Link>

            {/* Desktop nav — hidden on mobile (uses bottom nav instead) */}
            <nav className="hidden sm:flex items-center gap-2">
              {user ? (
                <>
                  <Link
                    href="/shops"
                    className="text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors"
                    style={{ color: 'var(--color-gray-600)' }}
                  >
                    الفروع
                  </Link>
                  <Link
                    href="/profile"
                    className="text-sm font-bold px-4 py-2 rounded-lg text-white cursor-pointer transition-opacity hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))' }}
                  >
                    حجوزاتي
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors"
                    style={{ color: 'var(--color-gray-600)' }}
                  >
                    دخول
                  </Link>
                  <Link
                    href="/register"
                    className="text-sm font-bold px-4 py-2 rounded-lg text-white cursor-pointer transition-opacity hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))' }}
                  >
                    سجل الآن
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile: show auth button only on small screens in header */}
            <div className="flex sm:hidden">
              {user ? (
                <Link
                  href="/profile"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))' }}
                >
                  <User className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="text-sm font-bold px-3 py-1.5 rounded-lg text-white"
                  style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))' }}
                >
                  دخول
                </Link>
              )}
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
          © {new Date().getFullYear()} The Digital Atelier
        </footer>

        {/* ── Mobile Bottom Navigation ── */}
        <nav
          className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t"
          style={{ borderColor: 'var(--color-gray-200)' }}
        >
          <div className="grid grid-cols-4 h-16">
            {[
              { href: '/',        icon: <Home className="w-5 h-5" />,         label: 'الرئيسية' },
              { href: '/shops',   icon: <Store className="w-5 h-5" />,        label: 'الفروع'   },
              { href: '/booking', icon: <CalendarCheck className="w-5 h-5" />, label: 'احجز'    },
              { href: user ? '/profile' : '/login',
                icon: <User className="w-5 h-5" />,
                label: user ? 'حسابي' : 'دخول' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors active:opacity-70"
                style={{ color: 'var(--color-gray-400)' }}
              >
                {item.icon}
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </body>
    </html>
  )
}
