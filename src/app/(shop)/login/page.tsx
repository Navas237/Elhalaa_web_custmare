import { login } from './actions'
import { SubmitButton } from './SubmitButton'
import Link from 'next/link'
import { Scissors } from 'lucide-react'

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  email_taken: 'هذا البريد الإلكتروني مستخدم بالفعل.',
}

interface Props {
  searchParams: Promise<{ error?: string; redirect?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { error, redirect: redirectTo } = await searchParams
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? 'حدث خطأ، يرجى المحاولة مرة أخرى.') : null

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-gray-200)',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))' }}
          >
            <Scissors className="w-6 h-6 text-white" />
          </div>
          <h1
            className="text-2xl font-extrabold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gray-900)' }}
          >
            تسجيل الدخول
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-gray-600)' }}>
            مرحباً بك مجدداً — سجل دخولك للمتابعة
          </p>
        </div>

        {/* Error */}
        {errorMessage && (
          <div
            className="rounded-xl p-3 mb-5 text-sm text-center font-medium"
            style={{
              backgroundColor: 'var(--color-brand-light)',
              color: 'var(--color-brand)',
              border: '1px solid var(--color-brand-border)',
            }}
          >
            {errorMessage}
          </div>
        )}

        <form action={login} className="flex flex-col gap-4">
          {/* Pass redirect destination through the form */}
          {redirectTo && (
            <input type="hidden" name="redirect" value={redirectTo} />
          )}
          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              htmlFor="email"
              style={{ color: 'var(--color-gray-800)' }}
            >
              البريد الإلكتروني
            </label>
            <input
              className="input-base"
              id="email"
              name="email"
              type="email"
              placeholder="example@email.com"
              required
              dir="ltr"
            />
          </div>

          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              htmlFor="password"
              style={{ color: 'var(--color-gray-800)' }}
            >
              كلمة المرور
            </label>
            <input
              className="input-base"
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              dir="ltr"
            />
          </div>

          <SubmitButton label="دخول" pendingLabel="جاري الدخول..." />
        </form>

        <div className="mt-6 text-center text-sm" style={{ color: 'var(--color-gray-600)' }}>
          ليس لديك حساب؟{' '}
          <Link
            href={redirectTo ? `/register?redirect=${encodeURIComponent(redirectTo)}` : '/register'}
            className="font-bold"
            style={{ color: 'var(--color-brand)' }}
          >
            سجل الآن
          </Link>
        </div>
      </div>
    </div>
  )
}
