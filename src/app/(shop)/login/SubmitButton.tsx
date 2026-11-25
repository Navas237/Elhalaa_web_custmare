'use client'

import { useFormStatus } from 'react-dom'

interface Props {
  label: string
  pendingLabel: string
}

/**
 * Submit button that disables itself while the parent form's Server Action
 * is running. Prevents double-tap/double-click from firing duplicate
 * sign-in/sign-up requests (which raced each other and surfaced a stale
 * "invalid credentials" page even though a session was created).
 */
export function SubmitButton({ label, pendingLabel }: Props) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="btn-primary mt-2"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}
