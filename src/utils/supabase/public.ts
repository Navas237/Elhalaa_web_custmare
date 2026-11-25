import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Cookie-free anon client for PUBLIC catalog data (shops / barbers / services).
 *
 * The SSR client (`@/utils/supabase/server`) calls `cookies()`, which forces
 * any page using it into dynamic rendering — silently disabling `revalidate`.
 * This client never touches cookies, so ISR/static caching actually applies
 * and repeat visits are served from the route cache instead of Supabase.
 *
 * ONLY for data covered by public RLS policies. Never for user-specific data.
 */
let cached: ReturnType<typeof createSupabaseClient<any>> | null = null

export function createPublicClient() {
  if (!cached) {
    // <any>: public catalog has no generated DB types; keeps rpc()/select()
    // untyped just like the previous SSR client behaved.
    cached = createSupabaseClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
  }
  return cached
}
