import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    console.error('NEXT_PUBLIC_APP_URL is not set')
  }
  return NextResponse.redirect(new URL('/login', appUrl || 'http://localhost:3000'))
}
