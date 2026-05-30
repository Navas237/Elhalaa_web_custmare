'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Secure server-side booking creation.
 *
 * Flow:
 *  1. Verify authenticated user + email confirmation
 *  2. Check rate limit via Edge Function
 *  3. Fetch profile data (name, phone) from DB
 *  4. Insert booking with server-trusted auth.uid() as client_id
 *  5. Return booking or structured error
 */
export async function createBooking(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'AUTH_REQUIRED', message: 'يجب تسجيل الدخول لإكمال الحجز' }
  }

  if (!user.email_confirmed_at) {
    return { error: 'EMAIL_NOT_VERIFIED', message: 'يرجى تأكيد بريدك الإلكتروني لإكمال الحجز' }
  }

  // ── Rate limiting (reuse owner app pattern) ──
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const rateRes = await fetch(`${supabaseUrl}/functions/v1/rate-limit-booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
      },
    })

    if (rateRes.status === 429) {
      const retryAfter = rateRes.headers.get('Retry-After')
      return {
        error: 'RATE_LIMITED',
        message: `عدد المحاولات كبير. يرجى الانتظار ${retryAfter ? `${retryAfter} ثانية` : 'قليلاً'} وحاول مرة أخرى.`,
      }
    }
    if (!rateRes.ok) {
      // Fail open if rate limiter is down — log but continue
      console.warn('Rate limit check failed, proceeding:', await rateRes.text())
    }
  } catch (err) {
    console.warn('Rate limiter unreachable, proceeding:', err)
  }

  // ── Extract form data ──
  const shopId       = formData.get('shopId') as string
  const staffId      = formData.get('staffId') as string
  const serviceId    = formData.get('serviceId') as string
  const bookingDate  = formData.get('bookingDate') as string
  const startTime    = formData.get('startTime') as string
  const endTime      = formData.get('endTime') as string
  const displayStart = formData.get('displayStartTime') as string

  if (!shopId || !staffId || !serviceId || !bookingDate || !startTime || !endTime) {
    return { error: 'MISSING_FIELDS', message: 'بيانات الحجز غير مكتملة' }
  }

  // ── Pre-check: client must not have an active unconfirmed booking ──
  const { data: pendingBookings, error: pendingError } = await supabase
    .from('bookings_v2')
    .select('id, status')
    .eq('client_id', user.id)
    .in('status', ['pending', 'waiting_time'])
    .limit(1)

  if (pendingError) {
    console.error('Pending booking check failed:', pendingError)
  }

  if (pendingBookings && pendingBookings.length > 0) {
    return {
      success: false,
      code: 'PENDING_BOOKING_EXISTS',
      message: 'لديك حجز في الانتظار بالفعل لا يمكنك اضافه حجز اخر',
    }
  }

  // ── Fetch profile for name / phone ──
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, phone')
    .eq('id', user.id)
    .single()

  // ── Server-side insert with trusted auth.uid() ──
  const { data: booking, error: insertError } = await supabase
    .from('bookings_v2')
    .insert({
      shop_id: shopId,
      staff_id: staffId,
      service_id: serviceId,
      client_id: user.id,
      client_name: profile?.name || 'عميل',
      client_phone: profile?.phone || null,
      booking_date: bookingDate,
      start_time: startTime,
      end_time: endTime,
      display_start_time: displayStart || startTime,
      status: 'pending',
      payment_method: 'cash',
    })
    .select()
    .single()

  if (insertError) {
    // Parse known errors from triggers
    const msg = insertError.message || ''
    if (msg.includes('PENDING_BOOKING_EXISTS') || msg.includes('pending booking')) {
      return {
        success: false,
        code: 'PENDING_BOOKING_EXISTS',
        message: 'لديك حجز في الانتظار بالفعل لا يمكنك اضافه حجز اخر',
      }
    }
    if (msg.includes('overlap') || msg.includes('Booking overlap') || insertError.code === 'P0001') {
      return { success: false, code: 'SLOT_TAKEN', message: 'عذراً، هذا الموعد تم حجزه للتو. يرجى اختيار وقت آخر.' }
    }
    return { success: false, code: 'INSERT_FAILED', message: 'حدث خطأ أثناء الحجز. حاول مرة أخرى.' }
  }

  return { success: true, booking }
}
