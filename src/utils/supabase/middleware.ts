import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES = ['/booking', '/profile']

// Routes accessible only when NOT logged in
const AUTH_ROUTES = ['/login', '/register']

export async function updateSession(request: NextRequest, extraHeaders?: Headers) {
  const requestHeaders = new Headers(request.headers)
  if (extraHeaders) {
    extraHeaders.forEach((value, key) => {
      requestHeaders.set(key, value)
    })
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
    {
      cookies: {
        getAll() {
          return request.cookies ? request.cookies.getAll() : []
        },
        setAll(cookiesToSet) {
          if (request.cookies) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          }
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Redirect unauthenticated users away from protected routes
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r))
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Preserve the full original URL (including query params) so the booking flow can be restored
    const redirectTarget = request.nextUrl.pathname + request.nextUrl.search
    url.searchParams.set('redirect', redirectTarget)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login/register
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r))
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
