import { signup } from '../login/actions'
import Link from 'next/link'
import { Scissors } from 'lucide-react'

const ERROR_MESSAGES: Record<string, string> = {
  email_taken: 'هذا البريد الإلكتروني مستخدم بالفعل.',
  invalid_email: 'البريد الإلكتروني غير صالح.',
  weak_password: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
  invalid_name: 'الاسم الكامل مطلوب.',
  invalid_phone: 'رقم الهاتف يجب أن يبدأ بـ 05 أو 06 أو 07 ويتكون من 10 أرقام.',
  invalid_credentials: 'فشل التسجيل، يرجى المحاولة مرة أخرى.',
}

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function RegisterPage({ searchParams }: Props) {
  const { error } = await searchParams
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
            إنشاء حساب جديد
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-gray-600)' }}>
            انضم إلى The Digital Atelier
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

        <form className="flex flex-col gap-4">
          {[
            { id: 'name',     label: 'الاسم الكامل',        type: 'text',     placeholder: 'محمد أحمد',       dir: 'rtl' },
            { id: 'phone',    label: 'رقم الهاتف',           type: 'tel',      placeholder: '05xxxxxxxx',      dir: 'ltr' },
            { id: 'email',    label: 'البريد الإلكتروني',   type: 'email',    placeholder: 'example@email.com', dir: 'ltr' },
            { id: 'password', label: 'كلمة المرور',          type: 'password', placeholder: '٨ أحرف على الأقل', dir: 'ltr' },
          ].map((field) => (
            <div key={field.id}>
              <label
                className="block text-sm font-semibold mb-1.5"
                htmlFor={field.id}
                style={{ color: 'var(--color-gray-800)' }}
              >
                {field.label}
              </label>
              <input
                className="input-base"
                id={field.id}
                name={field.id}
                type={field.type}
                placeholder={field.placeholder}
                dir={field.dir as 'ltr' | 'rtl'}
                required
              />
            </div>
          ))}

          <button formAction={signup} className="btn-primary mt-2">
            إنشاء حساب
          </button>
        </form>

        <div className="mt-6 text-center text-sm" style={{ color: 'var(--color-gray-600)' }}>
          لديك حساب بالفعل؟{' '}
          <Link href="/login" className="font-bold" style={{ color: 'var(--color-brand)' }}>
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  )
}
