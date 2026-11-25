'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { User } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

/**
 * User-dependent header controls (desktop nav + mobile action).
 * Fully client-side: reads the session from local storage, so the RootLayout
 * never calls cookies() and public routes stay static + ISR-cached.
 * Actual route protection is enforced by middleware + RLS, not by this nav.
 */
export default function HeaderAuth() {
  // undefined = still loading (prerender/initial), null = guest
  const [userId, setUserId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUserId(session?.user?.id ?? null)
    )
    return () => subscription.unsubscribe()
  }, [])

  if (userId === undefined) {
    // Neutral skeleton — same footprint, no layout shift, no logged-out flash
    return (
      <>
        <div className="hidden sm:block h-9 w-20 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--color-gray-100)' }} />
        <div className="h-8 w-8 rounded-lg animate-pulse sm:hidden" style={{ backgroundColor: 'var(--color-gray-100)' }} />
      </>
    )
  }

  const loggedIn = userId !== null

  return (
    <>
      {/* Desktop nav — hidden on mobile (uses bottom nav instead) */}
      <nav className="hidden sm:flex items-center gap-2">
        {loggedIn ? (
          <>
            <Link
              href="/shops"
              className="text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors"
              style={{ color: 'var(--color-gray-600)' }}
            >
              فروعنا
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

      {/* Mobile header control — visible on mobile only */}
      {loggedIn ? (
        <Link
          href="/profile"
          className="sm:hidden w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))' }}
        >
          <User className="w-4 h-4" />
        </Link>
      ) : (
        <Link
          href="/login"
          className="sm:hidden text-sm font-bold px-3 py-1.5 rounded-lg text-white"
          style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))' }}
        >
          <User className="w-4 h-4" />
        </Link>
      )}
    </>
  )
}
