'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    const redirectTo = formData.get('redirect') as string | null
    if (redirectTo) {
      redirect(`/login?redirect=${encodeURIComponent(redirectTo)}&error=invalid_credentials`)
    } else {
      redirect('/login?error=invalid_credentials')
    }
  }

  revalidatePath('/', 'layout')
  const redirectTo = formData.get('redirect') as string | null
  redirect(redirectTo || '/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email    = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const fullName = (formData.get('name') as string)?.trim()
  const phone    = (formData.get('phone') as string)?.trim()

  // Server-side validation
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect('/register?error=invalid_email')
  }
  if (!password || password.length < 8) {
    redirect('/register?error=weak_password')
  }
  if (!fullName || fullName.length < 2) {
    redirect('/register?error=invalid_name')
  }
  if (!phone || !/^(05|06|07)\d{8}$/.test(phone)) {
    redirect('/register?error=invalid_phone')
  }

  const { error, data: authData } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name: fullName },
    },
  })

  if (error) {
    redirect('/register?error=email_taken')
  }

  if (authData.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      name: fullName,
      phone: phone,
      role: 'client',
    })

    if (profileError) {
      console.error('Profile insert failed:', profileError)
      // Continue — user can complete profile later, but log for monitoring
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
