import { createPublicClient } from '@/utils/supabase/public'
import Link from 'next/link'
import { MapPin, Star, Scissors, ChevronLeft } from 'lucide-react'
import { ShopImage } from './ShopImage'
import { getTenant } from '@/utils/tenant'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ShopsPage() {
  const tenant = await getTenant()

  let explicitSubdomain: string | null = null
  try {
    const headersList = await headers()
    explicitSubdomain = headersList.get('x-tenant-subdomain')
    if (!explicitSubdomain) {
      const host = headersList.get('host') || headersList.get('x-forwarded-host') || ''
      const hostname = host.split(':')[0].toLowerCase()
      if (hostname.endsWith('.localhost')) {
        const sub = hostname.replace('.localhost', '').trim()
        if (sub && sub !== 'www') explicitSubdomain = sub
      } else if (hostname.endsWith('.localhost.com')) {
        const sub = hostname.replace('.localhost.com', '').trim()
        if (sub && sub !== 'www') explicitSubdomain = sub
      }
    }
  } catch {}

  const supabase = createPublicClient()
  
  let shops: any[] = []
  let error: any = null

  // 1. إذا تم الدخول عبر سبدومين مخصص، نجلب فروع ذلك الصالون فقط
  if (tenant.owner_id && explicitSubdomain) {
    const res = await supabase
      .from('shops_v2')
      .select('id, name, address, rating, image_url, status')
      .eq('owner_id', tenant.owner_id)
      .neq('status', 'closed')
      .order('created_at', { ascending: false })

    shops = res.data || []
    error = res.error
    console.log(`[ShopsPage] Query for owner_id '${tenant.owner_id}': found ${shops.length} shops`, error ? `error: ${JSON.stringify(error)}` : '')
  }

  // 2. إذا لم يكن هناك سب-دومين صريح أو لم توجد فروع للصالون المحدد، نجلب كل الفروع المفتوحة
  if (shops.length === 0) {
    const fallbackRes = await supabase
      .from('shops_v2')
      .select('id, name, address, rating, image_url, status, owner_id')
      .neq('status', 'closed')
      .order('created_at', { ascending: false })

    console.log(`[ShopsPage] Fallback all shops: found ${fallbackRes.data?.length ?? 0} shops`, fallbackRes.error ? `error: ${JSON.stringify(fallbackRes.error)}` : '', fallbackRes.data)

    if (fallbackRes.data && fallbackRes.data.length > 0) {
      shops = fallbackRes.data
    } else if (fallbackRes.error && !error) {
      error = fallbackRes.error
    }
  }

  if (error) {
    console.error('Error fetching shops:', error)
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="text-sm mb-4" style={{ color: 'var(--color-brand)' }}>
          عذراً، حدث خطأ أثناء تحميل الفروع.
        </p>
        <Link href="/" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          العودة للرئيسية
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm mb-4" style={{ color: 'var(--color-gray-400)' }}>
          <Link href="/" style={{ color: 'var(--color-gray-400)' }}>الرئيسية</Link>
          <ChevronLeft className="w-4 h-4" />
          <span style={{ color: 'var(--color-gray-900)' }}>فروعنا</span>
        </div>
        <h1
          className="text-3xl font-extrabold mb-2"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gray-900)' }}
        >
          {explicitSubdomain ? `فروع ${tenant.name}` : 'فروعنا المتاحة'}
        </h1>
        <p style={{ color: 'var(--color-gray-600)' }}>
          {explicitSubdomain 
            ? `اختر الفرع الأقرب إليك من فروع ${tenant.name} وابدأ تجربة الحجز`
            : 'اختر الفرع الأقرب إليك وابدأ تجربة الحجز بكل سهولة'}
        </p>
      </div>

      {/* Shops Grid */}
      {(!shops || shops.length === 0) ? (
        <div
          className="text-center py-20 rounded-2xl border"
          style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-gray-200)' }}
        >
          <Scissors className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--color-gray-400)' }} />
          <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--color-gray-900)' }}>
            {explicitSubdomain ? `لا توجد فروع متاحة لـ ${tenant.name} حالياً` : 'لا توجد فروع متاحة حالياً'}
          </h3>
          <p className="text-sm" style={{ color: 'var(--color-gray-400)' }}>
            يرجى المحاولة في وقت لاحق
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {shops.map((shop) => (
            <Link
              key={shop.id}
              href={`/shops/${shop.id}/barbers`}
              className="card card-hover cursor-pointer block p-6"
            >
              <div className="flex items-start gap-4">
                {/* Shop Icon */}
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))' }}
                >
                  <ShopImage src={shop.image_url} alt={shop.name} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h2
                      className="text-lg font-bold truncate"
                      style={{ color: 'var(--color-gray-900)', fontFamily: 'var(--font-heading)' }}
                    >
                      {shop.name}
                    </h2>
                    {shop.rating && shop.rating > 0 && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Star className="w-4 h-4 fill-current" style={{ color: '#F59E0B' }} />
                        <span className="text-sm font-bold" style={{ color: 'var(--color-gray-800)' }}>
                          {shop.rating}
                        </span>
                      </div>
                    )}
                  </div>

                  {shop.address && (
                    <div className="flex items-center gap-1 mb-3">
                      <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--color-gray-400)' }} />
                      <span className="text-sm truncate" style={{ color: 'var(--color-gray-600)' }}>
                        {shop.address}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="badge badge-success text-xs">
                      متاح للحجز
                    </span>
                    <ChevronLeft className="w-5 h-5" style={{ color: 'var(--color-gray-400)' }} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
