import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  // Use request.url so redirect works correctly in any environment (dev, preview, production)
  return NextResponse.redirect(new URL('/login', request.url))
}
