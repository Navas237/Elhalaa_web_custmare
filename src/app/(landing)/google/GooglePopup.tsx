'use client'

import { useEffect, useRef, useState } from 'react'
import { GOOGLE_MESSAGE_TYPE, GOOGLE_WEB_CLIENT_ID } from '@/utils/google-auth'

interface GoogleIdApi {
  accounts?: {
    id?: {
      initialize: (config: Record<string, unknown>) => void
      renderButton: (el: HTMLElement, options: Record<string, unknown>) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdApi
  }
}

/**
 * Runs on the auth host only, inside a popup opened by a shop site.
 * Shows Google's button. On success it posts the ID token to the shop origin
 * that opened the popup (already validated on the server) and closes itself.
 */
export default function GooglePopup({
  returnOrigin,
  hashedNonce,
}: {
  returnOrigin: string
  hashedNonce: string
}) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'sent' | 'error'>('loading')

  useEffect(() => {
    // setState is deferred out of the effect body (react-hooks/set-state-in-effect).
    const later = (fn: () => void) => queueMicrotask(fn)

    if (!window.opener) {
      later(() => setStatus('error'))
      return
    }

    const onCredential = (response: { credential?: string }) => {
      if (!response.credential || !window.opener) {
        setStatus('error')
        return
      }
      // targetOrigin is the validated shop origin: no other page can receive the token.
      window.opener.postMessage(
        { type: GOOGLE_MESSAGE_TYPE, credential: response.credential },
        returnOrigin
      )
      setStatus('sent')
      window.close()
    }

    const init = () => {
      const api = window.google?.accounts?.id
      if (!api || !buttonRef.current) {
        later(() => setStatus('error'))
        return
      }
      api.initialize({
        client_id: GOOGLE_WEB_CLIENT_ID,
        callback: onCredential,
        nonce: hashedNonce,
        ux_mode: 'popup',
        use_fedcm_for_prompt: true,
        auto_select: false,
      })
      api.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        locale: 'ar',
        width: 280,
      })
      later(() => setStatus('ready'))
    }

    if (window.google?.accounts?.id) {
      init()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = init
    script.onerror = () => setStatus('error')
    document.head.appendChild(script)
  }, [returnOrigin, hashedNonce])

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        background: '#F8F5FB',
        color: '#2A1238',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>الحلاق</h1>
      <p style={{ margin: 0, fontSize: 15 }}>
        {status === 'sent' ? 'تم تسجيل الدخول. يمكنك إغلاق هذه النافذة.' : 'سجّل الدخول بحساب جوجل للمتابعة'}
      </p>
      <div ref={buttonRef} style={{ minHeight: 44, display: status === 'sent' ? 'none' : 'block' }} />
      {status === 'loading' && <p style={{ margin: 0, fontSize: 13 }}>جاري التحميل...</p>}
      {status === 'error' && (
        <p style={{ margin: 0, fontSize: 14, color: '#B3261E' }}>
          تعذر فتح تسجيل جوجل. أغلق هذه النافذة وحاول مرة أخرى، أو سجّل بالبريد الإلكتروني.
        </p>
      )}
    </main>
  )
}
