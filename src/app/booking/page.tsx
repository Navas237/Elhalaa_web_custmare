'use client'

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ChevronLeft, CalendarDays, Clock, Loader2, Check, Scissors } from 'lucide-react'
import { bookingEngine } from '@/utils/SmartBookingEngine'
import { createBooking } from './actions'

// ── Date helpers ──
function getNextDays(count = 7) {
  const days = []
  const ARABIC_WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  for (let i = 0; i < count; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const dayName = ARABIC_WEEKDAYS[d.getDay()]
    const dayNum = d.getDate()
    days.push({ iso, dayName, dayNum })
  }
  return days
}

// ── Inner component that reads searchParams ──
function BookingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const shopId = searchParams.get('shopId')
  const barberId = searchParams.get('barberId')
  const serviceId = searchParams.get('serviceId')
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [shop, setShop] = useState<any>(null)
  const [barber, setBarber] = useState<any>(null)
  const [service, setService] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<any[]>([])
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Set default date once
  useEffect(() => {
    const today = new Date()
    setSelectedDate(today.toISOString().slice(0, 10))
  }, [])

  // Load booking context
  useEffect(() => {
    if (!shopId || !barberId || !serviceId) {
      router.push('/shops')
      return
    }

    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        const redirectUrl = encodeURIComponent(`/booking?shopId=${shopId}&barberId=${barberId}&serviceId=${serviceId}`)
        router.push(`/login?redirect=${redirectUrl}`)
        return
      }

      const [
        { data: shop },
        { data: barber },
        { data: service },
      ] = await Promise.all([
        supabase.from('shops_v2').select('*').eq('id', shopId).single(),
        supabase.from('shop_staff').select('*, profiles(name)').eq('id', barberId).single(),
        supabase.from('services').select('*').eq('id', serviceId).single(),
      ])

      setShop(shop)
      setBarber(barber)
      setService(service)
      setLoading(false)
    })()
  }, [shopId, barberId, serviceId])

  // Load smart slots
  const serviceDuration = service?.duration_minutes ?? service?.duration ?? 30
  useEffect(() => {
    if (!selectedDate || !service || !barberId) return
    ;(async () => {
      setSlotsLoading(true)
      setSelectedSlot(null)

      // Fetch working hours for this barber on the day of week
      const dayOfWeek = new Date(selectedDate).getDay()
      const { data: wh } = await supabase
        .from('working_hours')
        .select('start_time, end_time, is_off')
        .eq('staff_id', barberId)
        .eq('day_of_week', dayOfWeek)
        .single()

      if (!wh || wh.is_off) {
        setSlots([])
        setSlotsLoading(false)
        return
      }

      // Fetch existing bookings
      const { data: existingBookings } = await supabase
        .from('bookings_v2')
        .select('start_time, end_time, status')
        .eq('staff_id', barberId)
        .eq('booking_date', selectedDate)
        .neq('status', 'cancelled')

      const result = bookingEngine.findSmartSlots({
        staffId: barberId!,
        dateStr: selectedDate,
        serviceDuration,
        shiftStart: wh.start_time,
        shiftEnd: wh.end_time,
        existingBookings: existingBookings || [],
      })

      setSlots(result.success ? result.slots : [])
      setSlotsLoading(false)
    })()
  }, [selectedDate, service, barberId, serviceDuration, supabase])

  const handleBook = useCallback(async () => {
    if (!selectedSlot) return
    setSubmitting(true)
    setError('')

    const formData = new FormData()
    formData.append('shopId', shopId || '')
    formData.append('staffId', barberId || '')
    formData.append('serviceId', serviceId || '')
    formData.append('bookingDate', selectedDate)
    formData.append('startTime', selectedSlot.actual_start_time)
    formData.append('endTime', selectedSlot.end_time)
    formData.append('displayStartTime', selectedSlot.display_start_time || selectedSlot.actual_start_time)

    const result = await createBooking(formData)

    if (!result.success || result.error) {
      setError(result.message || 'حدث خطأ أثناء الحجز. حاول مرة أخرى.')
      setSubmitting(false)
      // If auth expired, redirect to login
      if (result.error === 'AUTH_REQUIRED') {
        const redirectUrl = encodeURIComponent(`/booking?shopId=${shopId}&barberId=${barberId}&serviceId=${serviceId}`)
        router.push(`/login?redirect=${redirectUrl}`)
      }
    } else {
      router.push(`/booking/success?id=${(result.booking as any)?.id}`)
    }
  }, [selectedSlot, shopId, barberId, serviceId, selectedDate, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-brand)' }} />
      </div>
    )
  }

  const days = getNextDays()

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--color-gray-400)' }}>
        <button onClick={() => router.back()} style={{ color: 'var(--color-gray-400)' }}>رجوع</button>
        <ChevronLeft className="w-4 h-4" />
        <span style={{ color: 'var(--color-gray-900)' }}>تأكيد الموعد</span>
      </div>

      {/* Summary card */}
      <div
        className="rounded-2xl p-5 mb-8 flex items-center gap-4"
        style={{ backgroundColor: 'var(--color-brand-light)', border: '1px solid var(--color-brand-border)' }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))' }}
        >
          <Scissors className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="font-bold" style={{ color: 'var(--color-gray-900)', fontFamily: 'var(--font-heading)' }}>
            {service?.name}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-gray-600)' }}>
            مع {(barber as any)?.profiles?.name} &mdash; {shop?.name}
          </p>
        </div>
        <div className="mr-auto text-left">
          <p className="text-xl font-extrabold" style={{ color: 'var(--color-brand)', fontFamily: 'var(--font-heading)' }}>
            {service?.price}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-gray-400)' }}>ج.م</p>
        </div>
      </div>

      {error && (
        <div
          className="rounded-xl p-4 mb-6 text-sm font-medium"
          style={{ backgroundColor: 'var(--color-brand-light)', color: 'var(--color-brand)', border: '1px solid var(--color-brand-border)' }}
        >
          {error}
        </div>
      )}

      {/* ── Date selection ── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-5 h-5" style={{ color: 'var(--color-brand)' }} />
          <h2 className="text-base font-bold" style={{ color: 'var(--color-gray-900)' }}>اختر التاريخ</h2>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {days.map((day) => {
            const active = selectedDate === day.iso
            return (
              <button
                key={day.iso}
                onClick={() => setSelectedDate(day.iso)}
                className="shrink-0 w-16 h-[72px] rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all"
                style={
                  active
                    ? {
                        background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))',
                        color: '#fff',
                      }
                    : {
                        backgroundColor: 'var(--color-bg-card)',
                        color: 'var(--color-gray-600)',
                        border: '1.5px solid var(--color-gray-200)',
                      }
                }
              >
                <span className="text-xs font-medium">{day.dayName}</span>
                <span className="text-xl font-extrabold leading-tight">{day.dayNum}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Time slots ── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5" style={{ color: 'var(--color-brand)' }} />
          <h2 className="text-base font-bold" style={{ color: 'var(--color-gray-900)' }}>الأوقات المتاحة</h2>
        </div>

        {slotsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand)' }} />
          </div>
        ) : slots.length === 0 ? (
          <div
            className="text-center py-10 rounded-2xl border text-sm"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              borderColor: 'var(--color-gray-200)',
              color: 'var(--color-gray-600)',
            }}
          >
            لا تتوفر أوقات في هذا اليوم
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {slots.map((slot, i) => {
              const active = selectedSlot?.actual_start_time === slot.actual_start_time
              return (
                <button
                  key={i}
                  onClick={() => setSelectedSlot(slot)}
                  className="py-3 px-4 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center justify-center gap-2"
                  style={
                    active
                      ? {
                          background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))',
                          color: '#fff',
                        }
                      : {
                          backgroundColor: 'var(--color-bg-card)',
                          color: 'var(--color-gray-800)',
                          border: '1.5px solid var(--color-gray-200)',
                        }
                  }
                >
                  {active && <Check className="w-4 h-4 shrink-0" />}
                  <span dir="ltr">{slot.display_start_arabic || slot.display_start_time}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Booking summary ── */}
      {selectedSlot && (
        <div
          className="rounded-2xl p-5 mb-6 space-y-3"
          style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-gray-200)' }}
        >
          <h3 className="font-bold border-b pb-3" style={{ color: 'var(--color-gray-900)', borderColor: 'var(--color-gray-100)' }}>
            ملخص الحجز
          </h3>
          {[
            { label: 'الخدمة', value: service?.name },
            { label: 'التاريخ', value: selectedDate },
            { label: 'الوقت', value: selectedSlot.display_start_arabic },
            { label: 'السعر', value: `${service?.price} ج.م` },
          ].map((row) => (
            <div key={row.label} className="flex justify-between text-sm">
              <span style={{ color: 'var(--color-gray-600)' }}>{row.label}</span>
              <span className="font-semibold" style={{ color: 'var(--color-gray-900)' }}>{row.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── CTA ── */}
      <button
        onClick={handleBook}
        disabled={!selectedSlot || submitting}
        className="btn-primary flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تأكيد الحجز'}
      </button>
    </div>
  )
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-brand)' }} />
      </div>
    }>
      <BookingContent />
    </Suspense>
  )
}
