import { createPublicClient } from '@/utils/supabase/public'
import { headers } from 'next/headers'
import { cache } from 'react'

export interface TenantBranding {
  logo_url: string | null
  primary_color: string
  tagline?: string
  description?: string
  hero_title?: string
  hero_subtitle?: string
  badge_text?: string
}

export interface Tenant {
  id: string
  owner_id: string
  name: string
  subdomain: string
  custom_domain: string | null
  timezone: string
  is_active: boolean
  branding: TenantBranding
}

export const DEFAULT_TENANT: Tenant = {
  id: '',
  owner_id: '',
  name: 'صالون الحلاقة',
  subdomain: 'default',
  custom_domain: null,
  timezone: 'Africa/Cairo',
  is_active: true,
  branding: {
    logo_url: null,
    primary_color: '#E8192C',
    tagline: 'أرقى صالون بالمنطقة',
    description: 'اختر حلاقك المفضل، وحدد الخدمة والوقت المناسب — كل ذلك في أقل من دقيقة.',
    hero_title: 'احجز موعدك في',
    badge_text: 'صالون الحلاقة والعناية بالرجل',
  },
}

/**
 * جلب بيانات الـ Tenant النشط بناءً على الـ Subdomain مع الكاش (Request-level cache)
 */
export const getTenant = cache(async (explicitSubdomain?: string | null): Promise<Tenant> => {
  let subdomain = explicitSubdomain

  // إذا لم يتم تمرير السب-دومين صراحة، نقرأه من الهيدرز أو من الـ host مباشرة
  if (!subdomain) {
    try {
      const headersList = await headers()
      subdomain = headersList.get('x-tenant-subdomain')

      if (!subdomain) {
        const host = headersList.get('host') || headersList.get('x-forwarded-host') || ''
        const hostname = host.split(':')[0].toLowerCase()
        if (hostname.endsWith('.localhost')) {
          const sub = hostname.replace('.localhost', '').trim()
          if (sub && sub !== 'www') subdomain = sub
        } else if (hostname.endsWith('.localhost.com')) {
          const sub = hostname.replace('.localhost.com', '').trim()
          if (sub && sub !== 'www') subdomain = sub
        }
      }
    } catch {
      // خارج سياق الطلب (مثلاً أثناء الـ Build)
    }
  }

  const supabase = createPublicClient()

  // 1. البحث بالـ Subdomain إذا كان متوفراً
  if (subdomain && subdomain !== 'default' && subdomain !== 'app' && subdomain !== 'admin') {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .ilike('subdomain', subdomain.trim())
      .maybeSingle()

    if (!error && data) {
      console.log(`[getTenant] Subdomain matched '${subdomain}':`, data.name, '| owner_id:', data.owner_id)
      return normalizeTenant(data)
    } else {
      console.warn(`[getTenant] No tenant found in DB for subdomain '${subdomain}'`, error?.message || '')
    }
  }

  // 2. إذا لم يكن هناك سب-دومين (زي localhost مباشرة)، نجلب أحدث صالون نشط في الداتا بيز
  const { data: latestTenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestTenant) {
    return normalizeTenant(latestTenant)
  }

  // 3. Fallback في حال لم توجد بيانات صالونات في الداتابيز بعد
  return DEFAULT_TENANT
})

function normalizeTenant(data: any): Tenant {
  const branding = (typeof data.branding === 'object' && data.branding !== null) 
    ? data.branding 
    : {}

  return {
    id: data.id || '',
    owner_id: data.owner_id || '',
    name: data.name || DEFAULT_TENANT.name,
    subdomain: data.subdomain || '',
    custom_domain: data.custom_domain || null,
    timezone: data.timezone || 'Africa/Cairo',
    is_active: data.is_active ?? true,
    branding: {
      logo_url: branding.logo_url || null,
      primary_color: branding.primary_color || DEFAULT_TENANT.branding.primary_color,
      tagline: branding.tagline || DEFAULT_TENANT.branding.tagline,
      description: branding.description || DEFAULT_TENANT.branding.description,
      hero_title: branding.hero_title || DEFAULT_TENANT.branding.hero_title,
      hero_subtitle: branding.hero_subtitle || '',
      badge_text: branding.badge_text || `${data.name || DEFAULT_TENANT.name}`,
    },
  }
}
