'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { safeRedirectPath } from '@/utils/safe-redirect'

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

function authUrl(path: '/login' | '/register', formData: FormData, error?: string) {
  const params = new URLSearchParams()
  const redirectTo = safeRedirectPath(formData.get('redirect'), '')
  if (redirectTo) params.set('redirect', redirectTo)
  if (error) params.set('error', error)
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
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
    redirect(authUrl('/login', formData, 'invalid_credentials'))
  }

  revalidatePath('/', 'layout')
  redirect(safeRedirectPath(formData.get('redirect'), '/'))
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const fullName = (formData.get('name') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(authUrl('/register', formData, 'invalid_email'))
  }
  if (!password || password.length < 8) {
    redirect(authUrl('/register', formData, 'weak_password'))
  }
  if (!fullName || fullName.length < 2) {
    redirect(authUrl('/register', formData, 'invalid_name'))
  }
  if (!phone || !EGYPT_PHONE_REGEX.test(phone)) {
    redirect(authUrl('/register', formData, 'invalid_phone'))
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
    redirect(authUrl('/register', formData, getSignupErrorCode(error)))
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
      redirect(authUrl('/register', formData, 'profile_failed'))
    }
  }

  revalidatePath('/', 'layout')
  redirect(safeRedirectPath(formData.get('redirect'), '/'))
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
