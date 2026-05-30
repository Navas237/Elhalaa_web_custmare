import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ChevronLeft, User2, Scissors } from 'lucide-react'

export const revalidate = 30

interface Params { params: Promise<{ id: string }> }

export default async function BarbersPage({ params }: Params) {
  const { id: shopId } = await params
  const supabase = await createClient()

  // Shop name
  const { data: shop, error: shopError } = await supabase
    .from('shops_v2')
    .select('name')
    .eq('id', shopId)
    .single()

  if (shopError || !shop) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="text-sm mb-4" style={{ color: 'var(--color-brand)' }}>الفرع غير موجود.</p>
        <Link href="/shops" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>العودة للفروع</Link>
      </div>
    )
  }

  // Use the same RPC the Owner app uses — most reliable way to get staff + profiles
  const { data: staffRaw, error: staffError } = await supabase
    .rpc('get_shop_staff_with_profiles', { p_shop_id: shopId })

  // Fallback: direct query without role filter if RPC fails
  let barbers: any[] = []

  if (staffError || !staffRaw) {
    console.error('RPC error, falling back to direct query:', staffError)
    const { data: fallback } = await supabase
      .from('shop_staff')
      .select('id, user_id, is_active')
      .eq('shop_id', shopId)
      .eq('is_active', true)

    barbers = (fallback || []).map((s: any) => ({
      id: s.id,
      user_id: s.user_id,
      name: 'حلاق',
      avatar_url: null,
    }))
  } else {
    barbers = staffRaw
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--color-gray-400)' }}>
        <Link href="/" style={{ color: 'var(--color-gray-400)' }}>الرئيسية</Link>
        <ChevronLeft className="w-4 h-4" />
        <Link href="/shops" style={{ color: 'var(--color-gray-400)' }}>الفروع</Link>
        <ChevronLeft className="w-4 h-4" />
        <span style={{ color: 'var(--color-gray-900)' }}>اختر الحلاق</span>
      </div>

      <div className="mb-8">
        <h1
          className="text-3xl font-extrabold mb-1"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gray-900)' }}
        >
          اختر الحلاق
        </h1>
        <p style={{ color: 'var(--color-gray-600)' }}>{shop.name}</p>
      </div>

      {barbers.length === 0 ? (
        <div
          className="text-center py-20 rounded-2xl border"
          style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-gray-200)' }}
        >
          <User2 className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--color-gray-400)' }} />
          <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--color-gray-900)' }}>
            لا يوجد حلاقون متاحون حالياً
          </h3>
          <p className="text-sm" style={{ color: 'var(--color-gray-400)' }}>يرجى المحاولة لاحقاً</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {barbers.map((barber: any) => {
            // RPC returns flat fields; fallback returns structured
            const staffId  = barber.staff_id  ?? barber.id
            const name     = barber.name  ?? barber.profiles?.name ?? 'حلاق'
            const avatar   = barber.avatar_url ?? barber.profiles?.avatar_url ?? null

            return (
              <Link
                key={staffId}
                href={`/shops/${shopId}/services?barberId=${staffId}`}
                className="card card-hover cursor-pointer p-5 flex flex-col items-center text-center gap-3"
              >
                {/* Avatar */}
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: 'var(--color-gray-100)', border: '2px solid var(--color-gray-200)' }}
                >
                  {avatar ? (
                    <img src={avatar} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <User2 className="w-8 h-8" style={{ color: 'var(--color-gray-400)' }} />
                  )}
                </div>

                <div>
                  <p
                    className="font-bold text-sm"
                    style={{ color: 'var(--color-gray-900)', fontFamily: 'var(--font-heading)' }}
                  >
                    {name}
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Scissors className="w-3 h-3" style={{ color: 'var(--color-brand)' }} />
                    <span className="text-xs" style={{ color: 'var(--color-gray-600)' }}>اختر</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
