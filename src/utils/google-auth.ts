/**
 * Google sign-in helpers. Pure functions, no framework imports, so they can be
 * unit tested with plain node.
 *
 * Flow: a shop site (vip.elhalaa.com) opens a popup on the one fixed auth host
 * (auth.elhalaa.com). Google runs there. The popup posts the Google ID token
 * back to the shop site that opened it, and the shop site signs in to Supabase
 * itself, so the session cookie belongs to the shop host.
 */

/** Hosts that are never a shop. Keep in sync with the dashboard project. */
export const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'admin', 'hq-7m4x', 'api', 'mail', 'default', 'auth',
])

export const AUTH_SUBDOMAIN = 'auth'
export const AUTH_PATH = '/google'
export const GOOGLE_MESSAGE_TYPE = 'elhalaa-google-credential'

export const GOOGLE_WEB_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '794335230977-dp62pcdq2g0c9j82n46svepqngqgt9jh.apps.googleusercontent.com'

function splitRoot(rootDomain: string) {
  const [host, port] = rootDomain.trim().toLowerCase().split(':')
  return { host, port: port || '' }
}

function isLocalRoot(rootDomain: string) {
  const { host } = splitRoot(rootDomain)
  return host === 'localhost' || host === 'localhost.com'
}

/** Origin of the auth host, e.g. https://auth.elhalaa.com or http://auth.localhost:3000. */
export function authOrigin(rootDomain: string): string {
  const { host, port } = splitRoot(rootDomain)
  const proto = isLocalRoot(rootDomain) ? 'http' : 'https'
  return `${proto}://${AUTH_SUBDOMAIN}.${host}${port ? `:${port}` : ''}`
}

/**
 * The shop sub domain of an origin, or null when the origin is not exactly
 * https://<one-label>.<root> (or http://<label>.localhost:<port> in dev), or the
 * label is reserved. Paths, queries, userinfo and extra labels are rejected.
 */
export function shopSubdomainFromOrigin(origin: unknown, rootDomain: string): string | null {
  if (typeof origin !== 'string' || origin.length > 200) return null
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    return null
  }
  const { host: rootHost, port: rootPort } = splitRoot(rootDomain)
  const local = isLocalRoot(rootDomain)
  if (url.protocol !== (local ? 'http:' : 'https:')) return null
  if (url.username || url.password) return null
  if (url.origin !== origin) return null // no path, query, fragment or trailing slash
  if (url.port !== (local ? rootPort : '')) return null
  const suffix = `.${rootHost}`
  if (!url.hostname.endsWith(suffix)) return null
  const sub = url.hostname.slice(0, -suffix.length)
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(sub)) return null
  if (RESERVED_SUBDOMAINS.has(sub)) return null
  return sub
}

/** SHA-256 hex nonce as a 64 char lowercase hex string. */
export function isHashedNonce(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
}

/** In-app browsers (Instagram, Facebook, WhatsApp, Line, TikTok...) often block Google sign-in popups. */
export function isInAppBrowser(userAgent: string): boolean {
  return /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|TikTok|musical_ly|Snapchat|Messenger/i.test(userAgent)
}
