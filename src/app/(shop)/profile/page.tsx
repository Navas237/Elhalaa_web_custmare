import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { CalendarDays, Clock, Scissors, MapPin, ChevronLeft, LogOut, User2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

// ── Status config ──
const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: 'قيد الانتظار', bg: '#FFF3E0', color: '#E65100' },
  confirmed: { label: 'مؤكد',         bg: '#EAF3DE', color: '#1A7A35' },
  completed: { label: 'مكتمل',        bg: '#F0F1F3', color: '#5A5F6B' },
  cancelled: { label: 'ملغي',         bg: '#FDECEA', color: '#E8192C' },
  no_show:   { label: 'غائب',         bg: '#FFF3E0', color: '#E65100' },
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ pastPage?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <p className="mb-4 text-sm" style={{ color: 'var(--color-gray-600)' }}>
          يجب تسجيل الدخول أولاً
        </p>
        <Link href="/login" className="btn-primary inline-block w-auto px-8">
          تسجيل الدخول
        </Link>
      </div>
    )
  }

  // ── Past bookings pagination (server-side, no full-history fetch) ──
  const PAGE_SIZE = 10
  const rawPage = Number((await searchParams)?.pastPage ?? 1)
  const pastPage = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1
  const pastFrom = (pastPage - 1) * PAGE_SIZE
  const pastTo = pastFrom + PAGE_SIZE // fetch one extra to detect hasMore

  const [{ data: profile }, { data: upcoming }, { data: pastChunk }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    // Upcoming are few — fetch all (capped)
    supabase
      .from('bookings_v2')
      .select(`*, shops_v2(name, address), shop_staff(profiles(name)), services(name, duration_minutes)`)
      .eq('client_id', user.id)
      .in('status', ['pending', 'confirmed', 'waiting_time'])
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(50),
    // Past history — paginated, newest first
    supabase
      .from('bookings_v2')
      .select(`*, shops_v2(name, address), shop_staff(profiles(name)), services(name, duration_minutes)`)
      .eq('client_id', user.id)
      .in('status', ['completed', 'cancelled', 'no_show'])
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false })
      .range(pastFrom, pastTo),
  ])

  const hasMorePast = (pastChunk?.length ?? 0) > PAGE_SIZE
  const past = (pastChunk ?? []).slice(0, PAGE_SIZE)
  const upcomingList = upcoming ?? []

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* ── Profile header ── */}
      <div
        className="flex items-center justify-between p-5 rounded-2xl mb-8"
        style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-gray-200)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-extrabold text-white"
            style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))' }}
          >
            {(profile as any)?.name?.charAt(0)?.toUpperCase() || <User2 className="w-6 h-6" />}
          </div>
          <div>
            <p className="font-bold text-lg" style={{ color: 'var(--color-gray-900)', fontFamily: 'var(--font-heading)' }}>
              {(profile as any)?.name || 'مرحباً'}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-gray-600)' }}>
              {(profile as any)?.phone || user.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/shops"
            className="text-sm font-bold px-4 py-2 rounded-xl text-white cursor-pointer transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))' }}
          >
            حجز جديد
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="p-2 rounded-xl cursor-pointer transition-colors"
              style={{ backgroundColor: 'var(--color-gray-100)', color: 'var(--color-gray-600)' }}
              title="تسجيل الخروج"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* ── Upcoming ── */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-6 rounded-full" style={{ backgroundColor: 'var(--color-brand)' }} />
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-gray-900)', fontFamily: 'var(--font-heading)' }}>
            المواعيد القادمة
          </h2>
          {upcomingList.length > 0 && (
            <span
              className="badge badge-brand"
            >
              {upcomingList.length}
            </span>
          )}
        </div>

        {upcomingList.length === 0 ? (
          <div
            className="text-center py-14 rounded-2xl border"
            style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-gray-200)' }}
          >
            <CalendarDays className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--color-gray-400)' }} />
            <p className="font-bold mb-1" style={{ color: 'var(--color-gray-900)' }}>لا توجد مواعيد قادمة</p>
            <Link
              href="/shops"
              className="text-sm font-semibold"
              style={{ color: 'var(--color-brand)' }}
            >
              احجز الآن
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingList.map((b) => <BookingCard key={b.id} booking={b} />)}
          </div>
        )}
      </section>

      {/* ── Past (paginated) ── */}
      {(past.length > 0 || pastPage > 1) && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-6 rounded-full" style={{ backgroundColor: 'var(--color-gray-300)' }} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-gray-800)', fontFamily: 'var(--font-heading)' }}>
              السجل السابق
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-75">
            {past.map((b) => <BookingCard key={b.id} booking={b} isPast />)}
          </div>
          {hasMorePast && (
            <div className="text-center mt-6">
              <Link
                href={`/profile?pastPage=${pastPage + 1}`}
                className="text-sm font-bold px-6 py-2.5 rounded-xl inline-block cursor-pointer transition-colors border"
                style={{ color: 'var(--color-brand)', borderColor: 'var(--color-brand-border)', backgroundColor: 'var(--color-bg-card)' }}
              >
                عرض المزيد
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function BookingCard({ booking, isPast = false }: { booking: any; isPast?: boolean }) {
  const status = STATUS[booking.status] ?? { label: booking.status, bg: '#F0F1F3', color: '#5A5F6B' }

  return (
    <div
      className="rounded-2xl overflow-hidden flex"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        border: '1px solid var(--color-gray-200)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Left accent */}
      {!isPast && (
        <div
          className="w-1.5 shrink-0"
          style={{ background: 'linear-gradient(180deg, var(--color-brand), var(--color-brand-dark))' }}
        />
      )}

      <div className="flex-1 p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <p className="font-bold text-base" style={{ color: 'var(--color-gray-900)', fontFamily: 'var(--font-heading)' }}>
              {booking.services?.name || 'خدمة'}
            </p>
            <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-brand)' }}>
              {booking.total_price ? `${booking.total_price} ج.م` : ''}
            </p>
          </div>
          <span
            className="badge text-xs shrink-0"
            style={{ backgroundColor: status.bg, color: status.color }}
          >
            {status.label}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-gray-600)' }}>
            <CalendarDays className="w-4 h-4 shrink-0" style={{ color: 'var(--color-gray-400)' }} />
            <span dir="ltr">{booking.booking_date}</span>
            <span style={{ color: 'var(--color-gray-400)' }}>•</span>
            <Clock className="w-4 h-4 shrink-0" style={{ color: 'var(--color-gray-400)' }} />
            <span dir="ltr">{booking.start_time?.slice(0, 5)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-gray-600)' }}>
            <Scissors className="w-4 h-4 shrink-0" style={{ color: 'var(--color-gray-400)' }} />
            <span>{booking.shop_staff?.profiles?.name || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-gray-600)' }}>
            <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--color-gray-400)' }} />
            <span className="truncate">{booking.shops_v2?.name}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
