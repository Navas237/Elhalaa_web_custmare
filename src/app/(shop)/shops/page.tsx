import { createPublicClient } from '@/utils/supabase/public'
import Link from 'next/link'
import { MapPin, Star, Scissors, ChevronLeft } from 'lucide-react'
import { ShopImage } from './ShopImage'
import { getTenant } from '@/utils/tenant'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ShopsPage() {
  const tenant = await getTenant()

  const supabase = createPublicClient()

  // Only this tenant's branches. A legacy branch with no tenant_id still counts
  // when it belongs to the tenant owner. Never list branches of other tenants.
  const { data: shopsData, error } = await supabase
    .from('shops_v2')
    .select('id, name, address, rating, image_url, status')
    .or(`tenant_id.eq.${tenant.id},and(tenant_id.is.null,owner_id.eq.${tenant.owner_id})`)
    .neq('status', 'closed')
    .order('created_at', { ascending: false })
  const shops: any[] = shopsData || []

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
          {`فروع ${tenant.name}`}
        </h1>
        <p style={{ color: 'var(--color-gray-600)' }}>
          {`اختر الفرع الأقرب إليك من فروع ${tenant.name} وابدأ تجربة الحجز`}
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
            {`لا توجد فروع متاحة لـ ${tenant.name} حالياً`}
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
