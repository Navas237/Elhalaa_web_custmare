import Link from 'next/link'
import { CheckCircle, CalendarCheck, Home, Clock } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'

interface Props {
  searchParams: Promise<{ id?: string }>
}

export default async function BookingSuccessPage({ searchParams }: Props) {
  const { id: bookingId } = await searchParams
  let booking: any = null

  if (bookingId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('bookings_v2')
      .select(`
        *,
        shops_v2(name, address),
        shop_staff(profiles(name)),
        services(name, duration_minutes)
      `)
      .eq('id', bookingId)
      .single()
    booking = data
  }

  const shopName = booking?.shops_v2?.name
  const barberName = booking?.shop_staff?.profiles?.name
  const serviceName = booking?.services?.name
  const bookingDate = booking?.booking_date
  const startTime = booking?.start_time?.slice(0, 5)

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-16">
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-gray-200)',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: 'var(--color-success-light)' }}
        >
          <CheckCircle className="w-10 h-10" style={{ color: 'var(--color-success)' }} />
        </div>

        <h1
          className="text-2xl font-extrabold mb-2"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gray-900)' }}
        >
          تم إرسال طلب الحجز!
        </h1>

        {/* Pending badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-6"
          style={{ backgroundColor: '#FFF3E0', color: '#E65100' }}
        >
          <Clock className="w-4 h-4" />
          في انتظار تأكيد الحجز
        </div>

        <p className="text-sm mb-6" style={{ color: 'var(--color-gray-600)' }}>
          شكراً لاختيارك The Digital Atelier. سيقوم الحلاق بالتأكيد قريباً.
        </p>

        {/* Booking details card */}
        {booking && (
          <div
            className="rounded-xl p-5 mb-6 text-right text-sm space-y-2"
            style={{
              backgroundColor: 'var(--color-gray-50)',
              border: '1px solid var(--color-gray-200)',
            }}
          >
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-gray-600)' }}>الخدمة</span>
              <span className="font-semibold" style={{ color: 'var(--color-gray-900)' }}>{serviceName}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-gray-600)' }}>الفرع</span>
              <span className="font-semibold" style={{ color: 'var(--color-gray-900)' }}>{shopName}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-gray-600)' }}>الحلاق</span>
              <span className="font-semibold" style={{ color: 'var(--color-gray-900)' }}>{barberName}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-gray-600)' }}>التاريخ</span>
              <span className="font-semibold" style={{ color: 'var(--color-gray-900)' }} dir="ltr">{bookingDate}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-gray-600)' }}>الوقت</span>
              <span className="font-semibold" style={{ color: 'var(--color-gray-900)' }} dir="ltr">{startTime}</span>
            </div>
            {bookingId && (
              <div className="pt-2 mt-2 border-t" style={{ borderColor: 'var(--color-gray-200)' }}>
                <span style={{ color: 'var(--color-gray-400)' }} className="text-xs">رقم الحجز: {bookingId.slice(0, 8)}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link
            href="/profile"
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            <CalendarCheck className="w-5 h-5" />
            عرض حجوزاتي
          </Link>
          <Link
            href="/"
            className="btn-secondary inline-flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            الرئيسية
          </Link>
        </div>
      </div>
    </div>
  )
}
