'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

const EGYPT_PHONE_REGEX = /^(010|011|012|015)\d{8}$/

function getSignupErrorCode(error: { message?: string; code?: string; status?: number }) {
  const message = error.message?.toLowerCase() ?? ''

  if (
    error.status === 429 ||
    error.code === 'over_email_send_rate_limit' ||
    message.includes('rate limit')
  ) {
    return 'email_rate_limit'
  }

  if (
    error.status === 422 ||
    error.code === 'user_already_exists' ||
    message.includes('already') ||
    message.includes('registered') ||
    message.includes('exists')
  ) {
    return 'email_taken'
  }

  return 'signup_failed'
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  // Normalize like signup does: keyboards/autofill often add a trailing
  // space or capital letters, which Supabase rejects with "Invalid login
  // credentials" even though the user typed the right address.
  const email = ((formData.get('email') as string) ?? '').trim().toLowerCase()
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Log the real reason server-side; the UI keeps the generic message
    // so we don't leak which part (email vs password) was wrong.
    console.error('Login failed:', error.code ?? error.status, error.message)
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

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const fullName = (formData.get('name') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect('/register?error=invalid_email')
  }
  if (!password || password.length < 8) {
    redirect('/register?error=weak_password')
  }
  if (!fullName || fullName.length < 2) {
    redirect('/register?error=invalid_name')
  }
  if (!phone || !EGYPT_PHONE_REGEX.test(phone)) {
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
    console.error('Signup failed:', error)
    redirect(`/register?error=${getSignupErrorCode(error)}`)
  }

  if (authData.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email: email,
      name: fullName,
      phone,
      role: 'client',
    })

    if (profileError) {
      console.error('Profile insert failed:', profileError)
      const redirectTo = formData.get('redirect') as string | null
      if (redirectTo) {
        redirect(`/register?redirect=${encodeURIComponent(redirectTo)}&error=profile_failed`)
      } else {
        redirect('/register?error=profile_failed')
      }
    }
  }

  revalidatePath('/', 'layout')
  const redirectTo = formData.get('redirect') as string | null
  redirect(redirectTo || '/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
