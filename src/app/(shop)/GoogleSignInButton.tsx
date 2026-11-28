'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { safeRedirectPath } from '@/utils/safe-redirect'
import { authOrigin, GOOGLE_MESSAGE_TYPE, isInAppBrowser } from '@/utils/google-auth'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'

function randomNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes))
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

type Status = 'idle' | 'waiting' | 'signing' | 'error'

/**
 * "Continue with Google" for the shop site. Opens a popup on the auth host,
 * receives the Google ID token by postMessage and signs in to Supabase here,
 * so the session cookie is created on this shop's own host.
 * The page never navigates until sign-in succeeds, so booking state is kept.
 */
export default function GoogleSignInButton({ redirectTo }: { redirectTo?: string | null }) {
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const nonceRef = useRef<{ raw: string; hashed: string } | null>(null)
  const popupRef = useRef<Window | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  // Prepare the nonce before the click: window.open must run synchronously in
  // the click handler or Safari blocks it.
  const prepareNonce = useCallback(async () => {
    const raw = randomNonce()
    nonceRef.current = { raw, hashed: await sha256Hex(raw) }
  }, [])

  useEffect(() => {
    prepareNonce()
    return () => cleanupRef.current?.()
  }, [prepareNonce])

  const fail = useCallback((text: string) => {
    cleanupRef.current?.()
    setStatus('error')
    setMessage(text)
    prepareNonce()
  }, [prepareNonce])

  const onClick = () => {
    const nonce = nonceRef.current
    if (!nonce) return
    setMessage('')
    cleanupRef.current?.()

    const authBase = authOrigin(ROOT_DOMAIN)
    const url = `${authBase}/google?origin=${encodeURIComponent(window.location.origin)}&nonce=${nonce.hashed}`
    const w = 440
    const h = 640
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - w) / 2))
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - h) / 2))
    const popup = window.open(url, 'elhalaa-google', `popup=yes,width=${w},height=${h},left=${left},top=${top}`)

    if (!popup) {
      fail(
        isInAppBrowser(navigator.userAgent)
          ? 'متصفح التطبيق لا يسمح بتسجيل جوجل. افتح الرابط في Chrome أو Safari، أو سجّل بالبريد الإلكتروني.'
          : 'المتصفح منع النافذة. اسمح بالنوافذ المنبثقة لهذا الموقع وحاول مرة أخرى.'
      )
      return
    }
    popupRef.current = popup
    setStatus('waiting')

    const onMessage = async (event: MessageEvent) => {
      // Only the auth host popup we opened, only our message type.
      if (event.origin !== authBase || event.source !== popupRef.current) return
      const data = event.data as { type?: string; credential?: unknown } | null
      if (!data || data.type !== GOOGLE_MESSAGE_TYPE || typeof data.credential !== 'string') return

      cleanupRef.current?.()
      setStatus('signing')
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: data.credential,
        nonce: nonce.raw,
      })
      if (error) {
        console.error('Google sign-in failed:', error.code ?? error.status, error.message)
        fail('تعذر تسجيل الدخول بجوجل. حاول مرة أخرى أو استخدم البريد الإلكتروني.')
        return
      }
      // Full navigation so the server sees the new session cookie.
      window.location.assign(safeRedirectPath(redirectTo, '/'))
    }

    // If the user closes the popup without choosing an account, reset the button.
    const timer = window.setInterval(() => {
      if (popupRef.current?.closed) {
        cleanupRef.current?.()
        setStatus((s) => (s === 'waiting' ? 'idle' : s))
        prepareNonce()
      }
    }, 600)

    window.addEventListener('message', onMessage)
    cleanupRef.current = () => {
      window.removeEventListener('message', onMessage)
      window.clearInterval(timer)
      cleanupRef.current = null
    }
  }

  const busy = status === 'waiting' || status === 'signing'

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-bold cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{
          backgroundColor: '#fff',
          color: 'var(--color-gray-900)',
          border: '1px solid var(--color-gray-200)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
          <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z" />
          <path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.600-5.900c-2.100 1.400-4.900 2.300-8.300 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
        </svg>
        {status === 'signing' ? 'جاري الدخول...' : status === 'waiting' ? 'أكمل في النافذة المفتوحة...' : 'المتابعة بحساب جوجل'}
      </button>
      {message && (
        <p role="alert" className="text-center text-xs" style={{ color: 'var(--color-brand)' }}>
          {message}
        </p>
      )}
    </div>
  )
}
