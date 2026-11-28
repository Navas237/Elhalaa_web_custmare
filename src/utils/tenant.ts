import { createPublicClient } from '@/utils/supabase/public'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { RESERVED_SUBDOMAINS } from '@/utils/google-auth'

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
    primary_color: '#2A1238',
    tagline: 'أرقى صالون بالمنطقة',
    description: 'اختر حلاقك المفضل، وحدد الخدمة والوقت المناسب — كل ذلك في أقل من دقيقة.',
    hero_title: 'احجز موعدك في',
    badge_text: 'صالون الحلاقة والعناية بالرجل',
  },
}

/**
 * Reserved hostnames. They are never tenants, and a shop can not claim them.
 * Keep in sync with the dashboard proxy and with the DB check when tenants are created.
 */
export { RESERVED_SUBDOMAINS }

/**
 * Resolve the active tenant from the host (x-tenant-subdomain, set by the proxy).
 * Strict: no subdomain, a reserved subdomain, an unknown or inactive tenant all
 * end in notFound(). There is no fallback to another shop.
 */
export const getTenant = cache(async (explicitSubdomain?: string | null): Promise<Tenant> => {
  let subdomain = explicitSubdomain
  if (!subdomain) {
    try {
      const headersList = await headers()
      subdomain = headersList.get('x-tenant-subdomain')
    } catch {
      // outside a request (build)
    }
  }

  subdomain = subdomain?.trim().toLowerCase() || null
  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) notFound()

  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('subdomain', subdomain)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) notFound()
  return normalizeTenant(data)
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

/**
 * True when the branch belongs to the tenant. A legacy branch with no tenant_id
 * counts when its owner is the tenant owner.
 */
export async function shopBelongsToTenant(
  shopId: string,
  tenant: Pick<Tenant, 'id' | 'owner_id'>,
  client?: { from: (t: string) => any },
): Promise<boolean> {
  if (!shopId || !tenant.id) return false
  const supabase = client ?? createPublicClient()
  const { data } = await supabase
    .from('shops_v2')
    .select('tenant_id, owner_id')
    .eq('id', shopId)
    .maybeSingle()
  if (!data) return false
  if (data.tenant_id) return data.tenant_id === tenant.id
  return !!tenant.owner_id && data.owner_id === tenant.owner_id
}
