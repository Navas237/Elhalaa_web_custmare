import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES = ['/booking', '/profile']

// Routes accessible only when NOT logged in
const AUTH_ROUTES = ['/login', '/register']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
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
