import type { Metadata } from 'next'
import { createPublicClient } from '@/utils/supabase/public'
import { isHashedNonce, shopSubdomainFromOrigin } from '@/utils/google-auth'
import GooglePopup from './GooglePopup'

export const metadata: Metadata = {
  title: 'تسجيل الدخول بجوجل | الحلاق',
  robots: { index: false, follow: false },
}

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'

interface Props {
  searchParams: Promise<{ origin?: string; nonce?: string }>
}

function Problem() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', color: '#2A1238' }}>
      <p>الرابط غير صالح. أغلق هذه النافذة وحاول من صفحة الصالون.</p>
    </main>
  )
}

/**
 * Auth host page (served on auth.<root> only, see src/proxy.ts).
 * Validates that the caller is an active shop site before showing Google's button.
 */
export default async function GoogleAuthPage({ searchParams }: Props) {
  const { origin, nonce } = await searchParams

  const subdomain = shopSubdomainFromOrigin(origin, ROOT_DOMAIN)
  if (!subdomain || !isHashedNonce(nonce)) return <Problem />

  const supabase = createPublicClient()
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .eq('is_active', true)
    .maybeSingle()
  if (!data) return <Problem />

  return <GooglePopup returnOrigin={origin as string} hashedNonce={nonce} />
}
