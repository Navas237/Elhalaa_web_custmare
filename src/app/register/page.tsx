import { signup } from '../login/actions'
import { SubmitButton } from '../login/SubmitButton'
import Link from 'next/link'
import { Scissors } from 'lucide-react'

const ERROR_MESSAGES: Record<string, string> = {
  email_taken: 'هذا البريد الإلكتروني مستخدم بالفعل.',
  invalid_email: 'البريد الإلكتروني غير صالح.',
  weak_password: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
  invalid_name: 'الاسم الكامل مطلوب.',
  invalid_phone: 'رقم الهاتف يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقم.',
  invalid_credentials: 'فشل التسجيل، يرجى المحاولة مرة أخرى.',
  email_rate_limit: 'تم إرسال طلبات تأكيد كثيرة خلال وقت قصير. انتظر دقيقة ثم حاول مرة أخرى.',
  profile_failed: 'تم إنشاء الحساب، لكن تعذر حفظ بيانات الملف الشخصي. يرجى التواصل معنا لإكمال الحساب.',
  signup_failed: 'تعذر إنشاء الحساب الآن. يرجى المحاولة مرة أخرى.',
}

interface Props {
  searchParams: Promise<{ error?: string; redirect?: string }>
}

export default async function RegisterPage({ searchParams }: Props) {
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
            إنشاء حساب جديد
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-gray-600)' }}>
            أنشئ حسابك لحجز وإدارة مواعيدك بكل سهولة
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

        <form action={signup} className="flex flex-col gap-4">
          {/* Pass redirect destination through the form */}
          {redirectTo && (
            <input type="hidden" name="redirect" value={redirectTo} />
          )}
          {[
            { id: 'name',     label: 'الاسم الكامل',        type: 'text',     placeholder: 'محمد أحمد',       dir: 'rtl' },
            { id: 'phone',    label: 'رقم الهاتف',           type: 'tel',      placeholder: '010xxxxxxxx',     dir: 'ltr', pattern: '^(010|011|012|015)[0-9]{8}$' },
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
                pattern={field.pattern}
                required
              />
            </div>
          ))}

          <SubmitButton label="إنشاء حساب" pendingLabel="جاري إنشاء الحساب..." />
        </form>

        <div className="mt-6 text-center text-sm" style={{ color: 'var(--color-gray-600)' }}>
          لديك حساب بالفعل؟{' '}
          <Link
            href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'}
            className="font-bold"
            style={{ color: 'var(--color-brand)' }}
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  )
}
