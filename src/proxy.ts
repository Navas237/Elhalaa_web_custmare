import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'
const RESERVED = new Set(['app', 'admin', 'hq-7m4x', 'api', 'mail'])

// Public legal pages, served on the root domain only.
const LEGAL_PATHS = new Set(['/privacy', '/terms'])

// ?tenant=<name> is a test hook. It is off on the production deployment.
const ALLOW_TENANT_QUERY = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV !== 'production'
  : process.env.NODE_ENV !== 'production'

/**
 * Subdomain from the Host header: [shop].[root], [shop].localhost.
 * Returns null on the root domain, on www and on hosts outside the root domain.
 */
export function extractSubdomain(request: NextRequest): string | null {
  if (ALLOW_TENANT_QUERY) {
    const queryTenant = request.nextUrl.searchParams.get('tenant')
    if (queryTenant) return queryTenant.toLowerCase().trim()
  }

  const host = request.headers.get('host') || ''
  const hostname = host.split(':')[0].toLowerCase()
  const cleanRoot = ROOT_DOMAIN.split(':')[0].toLowerCase()

  for (const base of [cleanRoot, 'localhost', 'localhost.com']) {
    if (hostname.endsWith(`.${base}`)) {
      const sub = hostname.slice(0, -(base.length + 1)).trim()
      return sub && sub !== 'www' ? sub : null
    }
  }
  return null
}

export async function proxy(request: NextRequest) {
  const subdomain = extractSubdomain(request)
  const { pathname } = request.nextUrl

  // Dashboard and platform admin hosts are served by the dashboard project, never here.
  if (subdomain && RESERVED.has(subdomain)) {
    return new NextResponse('Not found', { status: 404 })
  }

  // Root domain (and www): landing page only.
  if (!subdomain) {
    if (pathname === '/' || pathname === '') {
      const url = request.nextUrl.clone()
      url.pathname = '/site'
      return NextResponse.rewrite(url)
    }
    if (pathname === '/site' || LEGAL_PATHS.has(pathname) || pathname.startsWith('/_next') ) {
      return NextResponse.next()
    }
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Shop subdomain: the landing route must not be reachable here.
  if (pathname === '/site' || LEGAL_PATHS.has(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  const extraHeaders = new Headers()
  extraHeaders.set('x-tenant-subdomain', subdomain)

  const response = await updateSession(request, extraHeaders)
  response.headers.set('x-tenant-subdomain', subdomain)
  return response
}

export { proxy as middleware }

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
