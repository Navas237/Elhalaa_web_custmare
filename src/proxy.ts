import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'

/**
 * استخراج الـ Subdomain من الـ Hostname أو Query Param (?tenant=...)
 */
export function extractSubdomain(request: NextRequest): string | null {
  // 1. الدعم عبر Query Param (مفيد جداً للاختبار المباشر: ?tenant=vip)
  const queryTenant = request.nextUrl.searchParams.get('tenant')
  if (queryTenant) return queryTenant.toLowerCase().trim()

  const host = request.headers.get('host') || ''
  const hostname = host.split(':')[0]

  // 2. بيئة التطوير: [subdomain].localhost
  if (hostname.endsWith('.localhost')) {
    const sub = hostname.replace('.localhost', '').toLowerCase().trim()
    return sub && sub !== 'www' ? sub : null
  }

  // 3. بيئة التطوير المخصصة: [subdomain].localhost.com
  if (hostname.endsWith('.localhost.com')) {
    const sub = hostname.replace('.localhost.com', '').toLowerCase().trim()
    return sub && sub !== 'www' ? sub : null
  }

  // 4. الدومين الرئيسي للإنتاج: [subdomain].[rootDomain]
  const cleanRoot = ROOT_DOMAIN.split(':')[0].toLowerCase()
  if (hostname.endsWith(`.${cleanRoot}`)) {
    const sub = hostname.replace(`.${cleanRoot}`, '').toLowerCase().trim()
    return sub && sub !== 'www' ? sub : null
  }

  return null
}

export async function proxy(request: NextRequest) {
  const subdomain = extractSubdomain(request)

  const extraHeaders = new Headers()
  if (subdomain) {
    extraHeaders.set('x-tenant-subdomain', subdomain)
  }

  const response = await updateSession(request, extraHeaders)

  if (subdomain) {
    response.headers.set('x-tenant-subdomain', subdomain)
  }

  return response
}

export { proxy as middleware }

export const config = {
  matcher: [
    /*
     * تشغيل الميدلوير على كافة المسارات عدا الملفات الثابتة والصور ومسارات الـ API
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}


