'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Store, CalendarCheck, User } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface BottomNavigationProps {
  // Optional SSR hint; when omitted the session is detected client-side
  // so public routes stay static.
  hasUser?: boolean
}

export default function BottomNavigation({ hasUser: initial }: BottomNavigationProps) {
  const pathname = usePathname()
  const [hasUser, setHasUser] = useState<boolean | undefined>(initial)

  useEffect(() => {
    if (initial !== undefined) return
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setHasUser(!!data.session?.user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setHasUser(!!session?.user)
    )
    return () => subscription.unsubscribe()
  }, [initial])

  const navItems = [
    { href: '/', icon: <Home className="w-5 h-5" />, label: 'الرئيسية', testId: 'nav-home' },
    // { href: '/shops', icon: <Store className="w-5 h-5" />, label: 'الفروع', testId: 'nav-shops' },
    { href: '/booking', icon: <CalendarCheck className="w-5 h-5" />, label: 'احجز', testId: 'nav-booking' },
    {
      href: hasUser ? '/profile' : '/login',
      icon: <User className="w-5 h-5" />,
      label: hasUser ? 'حجوزاتي' : 'دخول',
      testId: 'nav-profile',
    },
  ]

  return (
    <nav
      data-testid="bottom-navigation"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t"
      style={{ borderColor: 'var(--color-gray-200)' }}
    >
      <div className="grid grid-cols-3 h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              data-testid={item.testId}
              className="flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors active:opacity-70"
              style={{ color: isActive ? 'var(--color-brand)' : 'var(--color-gray-400)' }}
            >
              {item.icon}
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
