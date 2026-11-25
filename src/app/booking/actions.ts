'use server'

import { createClient } from '@/utils/supabase/server'

/**
 * Secure server-side booking creation.
 *
 * Flow (2 serial phases instead of 4):
 *  1. Session validation + rate-limit check run CONCURRENTLY.
 *  2. Single `create_customer_booking` RPC does pending-check + profile
 *     lookup/auto-create + insert atomically in ONE DB roundtrip.
 * True abuse is still stopped by DB triggers + excl_no_double_booking.
 */
export async function createBooking(formData: FormData) {
  const supabase = await createClient()

  // ── Extract + validate form data first (fail fast, zero network) ──
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

  // ── Phase 1 (parallel): session validation overlaps the rate-limit HTTP call ──
  const [userResult, rate] = await Promise.all([
    supabase.auth.getUser(),
    checkRateLimit(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      (await supabase.auth.getSession()).data.session?.access_token || ''
    ),
  ])

  const user = userResult.data.user

  if (!user) {
    return { error: 'AUTH_REQUIRED', message: 'يجب تسجيل الدخول لإكمال الحجز' }
  }

  if (!user.email_confirmed_at) {
    return { error: 'EMAIL_NOT_VERIFIED', message: 'يرجى تأكيد بريدك الإلكتروني لإكمال الحجز' }
  }

  if (rate.limited) {
    return {
      error: 'RATE_LIMITED',
      message: `عدد المحاولات كبير. يرجى الانتظار ${rate.retryAfter ? `${rate.retryAfter} ثانية` : 'قليلاً'} وحاول مرة أخرى.`,
    }
  }

  // ── Phase 2 (single DB roundtrip) ──
  const { data: result, error: rpcError } = await supabase.rpc(
    'create_customer_booking',
    {
      p_shop_id: shopId,
      p_staff_id: staffId,
      p_service_id: serviceId,
      p_booking_date: bookingDate,
      p_start_time: startTime,
      p_end_time: endTime,
      p_display_start_time: displayStart || startTime,
    }
  )

  if (rpcError) {
    // Expired/invalid JWT: PostgREST rejects before the function runs
    const raw = `${rpcError.message || ''} ${rpcError.code || ''}`.toLowerCase()
    if (raw.includes('jwt') || raw.includes('expired') || raw.includes('401') || rpcError.code === 'PGRST301') {
      return { error: 'AUTH_REQUIRED', message: 'يجب تسجيل الدخول لإكمال الحجز' }
    }
    console.error('Booking RPC failed:', rpcError)
    return {
      success: false,
      code: 'INSERT_FAILED',
      message: 'حدث خطأ أثناء الحجز. حاول مرة أخرى.',
    }
  }

  if (!result?.success) {
    switch (result?.code) {
      case 'AUTH_REQUIRED':
        return { error: 'AUTH_REQUIRED', message: 'يجب تسجيل الدخول لإكمال الحجز' }
      case 'EMAIL_NOT_VERIFIED':
        return { error: 'EMAIL_NOT_VERIFIED', message: 'يرجى تأكيد بريدك الإلكتروني لإكمال الحجز' }
      case 'PENDING_BOOKING_EXISTS':
        return {
          success: false,
          code: 'PENDING_BOOKING_EXISTS',
          message: 'لديك حجز في الانتظار بالفعل لا يمكنك اضافه حجز اخر',
        }
      case 'SLOT_TAKEN':
        return {
          success: false,
          code: 'SLOT_TAKEN',
          message: 'عذراً، هذا الموعد تم حجزه للتو. يرجى اختيار وقت آخر.',
        }
      default:
        return {
          success: false,
          code: 'INSERT_FAILED',
          message: 'حدث خطأ أثناء الحجز. حاول مرة أخرى.',
        }
    }
  }

  return { success: true, booking: result.booking }
}

/**
 * Rate-limit check with a hard timeout. Never throws — fails open.
 * Runs CONCURRENTLY with session validation so it never adds
 * serial latency to the booking critical path.
 */
async function checkRateLimit(
  supabaseUrl: string,
  accessToken: string
): Promise<{ limited: boolean; retryAfter: string | null }> {
  try {
    const rateRes = await fetch(`${supabaseUrl}/functions/v1/rate-limit-booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      // Cap worst-case added latency even when run in parallel
      signal: AbortSignal.timeout(1500),
    })

    if (rateRes.status === 429) {
      return { limited: true, retryAfter: rateRes.headers.get('Retry-After') }
    }
    if (!rateRes.ok) {
      console.warn('Rate limit check failed, proceeding:', await rateRes.text())
    }
  } catch (err) {
    console.warn('Rate limiter unreachable, proceeding:', err)
  }
  return { limited: false, retryAfter: null }
}
