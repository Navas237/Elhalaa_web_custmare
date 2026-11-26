/**
 * Accept only same-site relative paths ("/booking?x=1"). Anything else
 * (absolute URLs, "//evil.com", "/\evil.com", empty) falls back.
 */
export function safeRedirectPath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string') return fallback
  const v = value.trim()
  if (!v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\')) return fallback
  return v
}
