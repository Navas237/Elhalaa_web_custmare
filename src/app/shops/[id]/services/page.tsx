import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ChevronLeft, Clock, ChevronLeft as ArrowRight } from 'lucide-react'

export const revalidate = 60

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ barberId?: string }>
}

export default async function ServicesPage({ params, searchParams }: Props) {
  const { id: shopId } = await params
  const { barberId } = await searchParams

  if (!barberId) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="text-sm mb-4" style={{ color: 'var(--color-brand)' }}>يرجى اختيار الحلاق أولاً.</p>
        <Link href={`/shops/${shopId}/barbers`} style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          اختيار الحلاق
        </Link>
      </div>
    )
  }

  const supabase = await createClient()

  const [
    { data: shop },
    { data: barber },
    { data: services },
  ] = await Promise.all([
    supabase.from('shops_v2').select('name').eq('id', shopId).single(),
    supabase.from('shop_staff').select('profiles(name)').eq('id', barberId).single(),
    supabase.from('services').select('*').eq('shop_id', shopId).eq('is_active', true).order('display_order'),
  ])

  const availableServices = services || []

  // Group by category
  const grouped = availableServices.reduce<Record<string, typeof availableServices>>((acc, s) => {
    const cat = s.category || 'خدمات'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--color-gray-400)' }}>
        <Link href="/shops" style={{ color: 'var(--color-gray-400)' }}>الفروع</Link>
        <ChevronLeft className="w-4 h-4" />
        <Link href={`/shops/${shopId}/barbers`} style={{ color: 'var(--color-gray-400)' }}>الحلاقون</Link>
        <ChevronLeft className="w-4 h-4" />
        <span style={{ color: 'var(--color-gray-900)' }}>اختر الخدمة</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-3xl font-extrabold mb-1"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gray-900)' }}
        >
          اختر الخدمة
        </h1>
        <p style={{ color: 'var(--color-gray-600)' }}>
          مع {(barber as any)?.profiles?.name || 'الحلاق'} &mdash; {shop?.name}
        </p>
      </div>

      {availableServices.length === 0 ? (
        <div
          className="text-center py-20 rounded-2xl border"
          style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-gray-200)' }}
        >
          <p className="font-bold mb-1" style={{ color: 'var(--color-gray-900)' }}>لا توجد خدمات متاحة</p>
          <p className="text-sm" style={{ color: 'var(--color-gray-400)' }}>يرجى المحاولة لاحقاً</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              {/* Category label */}
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-base font-bold" style={{ color: 'var(--color-gray-800)' }}>
                  {category}
                </h2>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-gray-100)' }} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((service) => (
                  <Link
                    key={service.id}
                    href={`/booking?shopId=${shopId}&barberId=${barberId}&serviceId=${service.id}`}
                    className="card card-hover cursor-pointer p-5 flex items-center gap-4"
                  >
                    {/* Left: color strip */}
                    <div
                      className="w-1 self-stretch rounded-full shrink-0"
                      style={{ backgroundColor: 'var(--color-brand)' }}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-bold mb-1 truncate"
                        style={{ color: 'var(--color-gray-900)', fontFamily: 'var(--font-heading)' }}
                      >
                        {service.name}
                      </p>
                      {service.description && (
                        <p
                          className="text-sm mb-2 line-clamp-1"
                          style={{ color: 'var(--color-gray-600)' }}
                        >
                          {service.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" style={{ color: 'var(--color-gray-400)' }} />
                        <span className="text-xs" style={{ color: 'var(--color-gray-600)' }}>
                          {service.duration_minutes || service.duration} دقيقة
                        </span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-left shrink-0">
                      <p
                        className="text-lg font-extrabold"
                        style={{ color: 'var(--color-brand)', fontFamily: 'var(--font-heading)' }}
                      >
                        {service.price}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-gray-400)' }}>ج.م</p>
                    </div>

                    <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'var(--color-gray-400)' }} />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
