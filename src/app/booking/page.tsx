'use client'

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ChevronLeft, CalendarDays, Clock, Loader2, Check, Scissors, Star } from 'lucide-react'
import { createBooking } from './actions'
import { log } from 'console'

// ── Time formatting helpers ──
function timeStrToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + (m || 0)
}

function formatArabicTime(timeStr: string): string {
  const minutes = timeStrToMinutes(timeStr)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const period = h >= 12 ? 'م' : 'ص'
  const displayH = h % 12 || 12
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`
}

// ── Date helpers (server-time aligned) ──
function getNextDaysFromDate(serverDateStr: string, count = 7) {
  const days = []
  const ARABIC_WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  // Parse as UTC to avoid timezone shift (e.g. Cairo UTC+3 shifting date back by 1)
  const [y, mo, d] = serverDateStr.split('-').map(Number)
  for (let i = 0; i < count; i++) {
    const utc = Date.UTC(y, mo - 1, d + i)
    const dateObj = new Date(utc)
    const iso = dateObj.toISOString().slice(0, 10)
    const dayName = ARABIC_WEEKDAYS[dateObj.getUTCDay()]
    const dayNum = dateObj.getUTCDate()
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
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [shop, setShop] = useState<any>(null)
  const [barber, setBarber] = useState<any>(null)
  const [service, setService] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [serverDate, setServerDate] = useState('')
  const [slots, setSlots] = useState<any[]>([])
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('afternoon')
  const [aiMessage, setAiMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Get server date once on mount
  useEffect(() => {
    ;(async () => {
      const { data: timeData } = await supabase.rpc('get_server_time', {
        p_timezone: 'Africa/Cairo',
      })
      const date = timeData?.[0]?.server_date
      if (date) {
        setServerDate(date)
        setSelectedDate(date)
      } else {
        setError('تعذر تحميل الوقت من الخادم. يرجى تحديث الصفحة.')
      }
    })()
  }, [supabase])

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
        { data: shop, error: shopError },
        { data: barber, error: barberError },
        { data: service, error: serviceError },
      ] = await Promise.all([
        supabase.from('shops_v2').select('*').eq('id', shopId).maybeSingle(),
        supabase.from('shop_staff').select('id, shop_id, user_id, is_active').eq('id', barberId).maybeSingle(),
        supabase.from('services').select('*').eq('id', serviceId).maybeSingle(),
      ])

      if (shopError || barberError || serviceError || !shop || !barber || !service) {
        setError('تعذر تحميل بيانات الحجز. يرجى اختيار الفرع والحلاق والخدمة مرة أخرى.')
        setLoading(false)
        return
      }

      setShop(shop)
      setBarber(barber)
      setService(service)
      setLoading(false)
    })()
  }, [shopId, barberId, serviceId, router, supabase])

  // Load available slots from server-side Smart Booking Engine
  const serviceDuration = service?.duration_minutes ?? service?.duration ?? 30
  const loadSlots = useCallback(async () => {
    if (!selectedDate || !service || !barberId) return
    setSlotsLoading(true)
    setSelectedSlot(null)
    setAiMessage('')

    const { data, error: rpcError } = await supabase.functions.invoke('smart-booking-slots', {
      body: {
        shop_id: shopId,
        staff_id: barberId,
        service_id: serviceId,
        target_date: selectedDate,
        time_preference: { period: selectedPeriod },
        service_duration: serviceDuration
      }
    })

  console.log(data


    
  );
  

    if (rpcError || !data?.success) {
      console.error('smart-booking-slots error:', rpcError || data?.error)
      setSlots([])
      setSlotsLoading(false)
      return
    }

    const staffResult = data.staff_results?.[0]
    
    if (staffResult?.message) {
      setAiMessage(staffResult.message)
    }

    const mappedSlots = (staffResult?.recommended_slots || []).map((slot: any) => ({
      display_start_time: slot.display_start_time || slot.start_time,
      display_start_arabic: formatArabicTime(slot.display_start_time || slot.start_time),
      actual_start_time: slot.actual_start_time || slot.start_time,
      actual_start_arabic: formatArabicTime(slot.actual_start_time || slot.start_time),
      end_time: slot.end_time,
      end_time_arabic: formatArabicTime(slot.end_time),
      is_recommended: true,
      score: slot.score,
      reason: slot.reason
    }))

    setSlots(mappedSlots)
    setSlotsLoading(false)
  }, [selectedDate, selectedPeriod, service, barberId, shopId, serviceId, serviceDuration, supabase])

  useEffect(() => {
    loadSlots()
  }, [loadSlots])

  // Realtime: refresh slots when bookings change for this staff
  useEffect(() => {
    if (!barberId || !selectedDate) return

    const channel = supabase
      .channel(`staff-bookings-${barberId}-${selectedDate}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings_v2',
          filter: `staff_id=eq.${barberId}`,
        },
        () => {
          // Debounce slightly to avoid rapid re-fetching
          loadSlots()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [barberId, selectedDate, supabase, loadSlots])

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

  const days = serverDate ? getNextDaysFromDate(serverDate) : []

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
            مع الحلاق &mdash; {shop?.name}
          </p>
        </div>
        <div className="ms-auto text-start">
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
          {days.length === 0 && (
            <div className="h-[72px] flex items-center justify-center px-4">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand)' }} />
            </div>
          )}
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

      {/* ── Period selection ── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5" style={{ color: 'var(--color-brand)' }} />
          <h2 className="text-base font-bold" style={{ color: 'var(--color-gray-900)' }}>اختر فترة الحجز</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { id: 'morning', label: 'الصبح (6 ص - 12 م)' },
            { id: 'afternoon', label: 'الظهر (12 م - 3 م)' },
            { id: 'evening', label: 'العصر (3 م - 6 م)' },
            { id: 'night', label: 'المسا (6 م - 11 م)' },
          ].map((period) => {
            const active = selectedPeriod === period.id
            return (
              <button
                key={period.id}
                onClick={() => setSelectedPeriod(period.id)}
                className="py-2 px-4 rounded-xl text-sm font-bold transition-all"
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
                {period.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Time slots ── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Check className="w-5 h-5" style={{ color: 'var(--color-brand)' }} />
          <h2 className="text-base font-bold" style={{ color: 'var(--color-gray-900)' }}>المواعيد المقترحة</h2>
        </div>

        {aiMessage && !slotsLoading && slots.length > 0 && (
           <div className="mb-4 p-4 rounded-xl text-sm flex gap-3 items-start" style={{ backgroundColor: 'var(--color-brand-light)', color: 'var(--color-brand-dark)', border: '1px solid var(--color-brand-border)' }}>
             <Star className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} />
             <span className="leading-relaxed font-medium">{aiMessage}</span>
           </div>
        )}

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {slots.map((slot, i) => {
              const active = selectedSlot?.actual_start_time === slot.actual_start_time
              return (
                <button
                  key={i}
                  onClick={() => setSelectedSlot(slot)}
                  className="py-3 px-4 rounded-xl cursor-pointer transition-all flex flex-col items-start text-start gap-2 relative"
                  style={
                    active
                      ? {
                          background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))',
                          color: '#fff',
                        }
                      : {
                          backgroundColor: 'var(--color-bg-card)',
                          color: 'var(--color-gray-800)',
                          border: slot.is_recommended
                            ? '1.5px solid var(--color-brand)'
                            : '1.5px solid var(--color-gray-200)',
                        }
                  }
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 shrink-0 opacity-70" />
                      <span className="font-extrabold text-base" dir="ltr">{slot.display_start_arabic || slot.display_start_time}</span>
                    </div>
                    {active && <Check className="w-5 h-5 shrink-0" />}
                  </div>
                  {slot.reason && (
                    <span className="text-xs font-medium opacity-90 leading-relaxed">
                      {slot.reason}
                    </span>
                  )}
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
