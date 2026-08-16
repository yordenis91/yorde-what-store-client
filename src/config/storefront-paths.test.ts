import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * The module reads window.location and the runtime config once, at import time
 * — the hostname cannot change without a full page load, so recomputing it
 * would be waste. Tests therefore have to set the environment up first and
 * re-import, rather than calling a setter.
 */
async function loadWith({ href, rootDomain }: { href: string; rootDomain?: string }) {
  vi.resetModules()

  const url = new URL(href)
  vi.stubGlobal('location', {
    hostname: url.hostname,
    port: url.port,
    protocol: url.protocol,
    origin: url.origin,
    href: url.href,
    pathname: url.pathname,
  })
  window.__APP_CONFIG__ = rootDomain ? { storefrontRootDomain: rootDomain } : undefined

  return import('./storefront')
}

afterEach(() => {
  vi.unstubAllGlobals()
  window.__APP_CONFIG__ = undefined
})

describe('path mode (no root domain configured)', () => {
  it('detects no tenant from the host', async () => {
    const { TENANT_SLUG_FROM_HOST } = await loadWith({ href: 'https://midominio.com/' })

    expect(TENANT_SLUG_FROM_HOST).toBeNull()
  })

  it('keeps the slug in the path', async () => {
    const { storefrontPath } = await loadWith({ href: 'https://midominio.com/' })

    expect(storefrontPath('mitienda')).toBe('/store/mitienda')
    expect(storefrontPath('mitienda', '/cart')).toBe('/store/mitienda/cart')
    expect(storefrontPath('mitienda', '/product/abc')).toBe('/store/mitienda/product/abc')
  })

  it('builds a shareable URL under the current origin', async () => {
    const { storefrontUrl } = await loadWith({ href: 'https://midominio.com/admin' })

    expect(storefrontUrl('mitienda')).toBe('https://midominio.com/store/mitienda')
  })
})

describe('subdomain mode', () => {
  it('resolves the tenant from the host', async () => {
    const mod = await loadWith({ href: 'https://mitienda.midominio.com/', rootDomain: 'midominio.com' })

    expect(mod.TENANT_SLUG_FROM_HOST).toBe('mitienda')
  })

  it('drops the slug from the path, mounting the store at the root', async () => {
    const { storefrontPath } = await loadWith({
      href: 'https://mitienda.midominio.com/',
      rootDomain: 'midominio.com',
    })

    expect(storefrontPath('mitienda')).toBe('/')
    expect(storefrontPath('mitienda', '/cart')).toBe('/cart')
    expect(storefrontPath('mitienda', '/product/abc')).toBe('/product/abc')
  })

  /**
   * The admin runs on the platform host, so the QR code and share link it
   * renders must point at the store's own subdomain rather than the host the
   * owner happens to be looking at.
   */
  it('builds a store URL on the store subdomain even from the platform host', async () => {
    const { storefrontUrl } = await loadWith({
      href: 'https://midominio.com/admin',
      rootDomain: 'midominio.com',
    })

    expect(storefrontUrl('mitienda')).toBe('https://mitienda.midominio.com')
  })

  it('keeps the port, so local development links work', async () => {
    const { storefrontUrl } = await loadWith({
      href: 'http://localhost:5173/admin',
      rootDomain: 'localhost',
    })

    expect(storefrontUrl('mitienda')).toBe('http://mitienda.localhost:5173')
  })

  it('treats a reserved subdomain as the platform host', async () => {
    const mod = await loadWith({ href: 'https://www.midominio.com/', rootDomain: 'midominio.com' })

    expect(mod.TENANT_SLUG_FROM_HOST).toBeNull()
    expect(mod.storefrontPath('mitienda')).toBe('/store/mitienda')
  })
})
