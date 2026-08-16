import { runtimeValue } from './runtime'

/**
 * Apex domain the storefront subdomains hang off (`tienda.midominio.com` →
 * `midominio.com`). Unset means subdomain mode is off and storefronts are only
 * reachable at `/store/:slug`.
 */
export const STOREFRONT_ROOT_DOMAIN =
  runtimeValue('storefrontRootDomain') ?? import.meta.env.VITE_STOREFRONT_ROOT_DOMAIN ?? null

/** Subdomains that belong to the platform and can never name a store. */
const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'admin', 'app', 'panel', 'static', 'cdn', 'mail'])

/**
 * Extracts a store slug from a hostname, or null when the host is the platform
 * itself. Exported for testing; callers want TENANT_SLUG_FROM_HOST.
 *
 * Only a single label directly under the root domain counts — `a.b.root.com`
 * is not a store, so a stray DNS entry can't be read as one.
 */
export function resolveTenantFromHost(hostname: string, rootDomain: string | null): string | null {
  if (!rootDomain) return null

  const host = hostname.toLowerCase()
  const root = rootDomain.toLowerCase().replace(/^\.+/, '')
  if (!root || host === root || !host.endsWith(`.${root}`)) return null

  const prefix = host.slice(0, -(root.length + 1))
  if (!prefix || prefix.includes('.') || RESERVED_SUBDOMAINS.has(prefix)) return null

  return prefix
}

/**
 * Store this page is serving, or null on the platform host. Read once: the
 * hostname cannot change without a full page load.
 */
export const TENANT_SLUG_FROM_HOST = resolveTenantFromHost(window.location.hostname, STOREFRONT_ROOT_DOMAIN)

/**
 * Router path for a storefront subpath. On a store subdomain the storefront is
 * mounted at the root, so the slug drops out of the URL entirely.
 */
export function storefrontPath(slug: string, subpath = ''): string {
  const base = TENANT_SLUG_FROM_HOST ? '' : `/store/${slug}`
  return `${base}${subpath}` || '/'
}

/**
 * Absolute URL of a store, for links that leave the current page: the QR code
 * and share link in the admin dashboard, and Stripe's return URLs. Built from
 * the configured root domain when there is one, so the admin — which runs on the
 * platform host — still hands out the store's own subdomain.
 */
export function storefrontUrl(slug: string): string {
  if (!STOREFRONT_ROOT_DOMAIN) return `${window.location.origin}/store/${slug}`

  const port = window.location.port ? `:${window.location.port}` : ''
  return `${window.location.protocol}//${slug}.${STOREFRONT_ROOT_DOMAIN}${port}`
}
