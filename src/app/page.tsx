import Link from 'next/link'
import { Scissors, CalendarCheck, Star, Clock } from 'lucide-react'
import { getTenant } from '@/utils/tenant'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Home() {
  const tenant = await getTenant()

  return (
    <div>
      {/* ── Hero ── */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8"
          style={{ backgroundColor: 'var(--color-brand-light)', color: 'var(--color-brand)' }}
        >
          <Scissors className="w-4 h-4" />
          {tenant.branding.badge_text || `${tenant.name} للحلاقة`}
        </div>

        <h1
          className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gray-900)' }}
        >
          {tenant.branding.hero_title || 'احجز موعدك في'} <br />
          <span style={{ color: 'var(--color-brand)' }}>{tenant.name}</span>
          {tenant.branding.tagline ? ` — ${tenant.branding.tagline}` : ' — أرقى صالون بالمنطقة'}
        </h1>

        <p className="text-lg md:text-xl mb-10 max-w-xl mx-auto" style={{ color: 'var(--color-gray-600)' }}>
          {tenant.branding.description || 'اختر حلاقك المفضل، وحدد الخدمة والوقت المناسب — كل ذلك في أقل من دقيقة.'}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/shops"
            className="inline-flex items-center gap-2 font-bold text-white px-8 py-4 rounded-xl text-base cursor-pointer transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))' }}
          >
            <CalendarCheck className="w-5 h-5" />
            احجز الآن
          </Link>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2
          className="text-2xl md:text-3xl font-bold text-center mb-12"
          style={{ color: 'var(--color-gray-900)', fontFamily: 'var(--font-heading)' }}
        >
          كيف يعمل الحجز؟
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: '١',
              icon: <Scissors className="w-6 h-6" />,
              title: 'اختر الفرع',
              desc: `تصفح فروع ${tenant.name} واختر الفرع الأقرب إليك`,
            },
            {
              step: '٢',
              icon: <Star className="w-6 h-6" />,
              title: 'اختر الحلاق والخدمة',
              desc: 'اختر حلاقك المفضل والخدمة التي تريدها',
            },
            {
              step: '٣',
              icon: <Clock className="w-6 h-6" />,
              title: 'حدد الوقت',
              desc: 'اختر الوقت المناسب من الأوقات المتاحة وأكد حجزك',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="card p-6 flex flex-col gap-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))' }}
                >
                  {item.icon}
                </div>
                <span
                  className="text-3xl font-extrabold leading-none"
                  style={{ color: 'var(--color-brand-light)', fontFamily: 'var(--font-heading)' }}
                >
                  {item.step}
                </span>
              </div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-gray-900)' }}>
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-gray-600)' }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="text-center py-16 px-4"
        style={{ backgroundColor: 'var(--color-bg-card)', borderTop: '1px solid var(--color-gray-100)' }}
      >
        <h2
          className="text-2xl md:text-3xl font-bold mb-4"
          style={{ color: 'var(--color-gray-900)', fontFamily: 'var(--font-heading)' }}
        >
          جاهز لتجربة إطلالة جديدة؟
        </h2>
        <p className="mb-8" style={{ color: 'var(--color-gray-600)' }}>
          انضم لآلاف العملاء وأحجز موعدك الآن
        </p>
        <Link
          href="/shops"
          className="inline-flex items-center gap-2 font-bold text-white px-8 py-4 rounded-xl text-base cursor-pointer transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))' }}
        >
          <CalendarCheck className="w-5 h-5" />
          ابدأ الحجز
        </Link>
      </section>
    </div>
  )
}

