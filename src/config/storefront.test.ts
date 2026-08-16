import { describe, expect, it } from 'vitest'
import { resolveTenantFromHost } from './storefront'

const ROOT = 'midominio.com'

describe('resolveTenantFromHost', () => {
  it('reads the store slug from a subdomain', () => {
    expect(resolveTenantFromHost('mitienda.midominio.com', ROOT)).toBe('mitienda')
  })

  it('is case-insensitive, since hostnames are', () => {
    expect(resolveTenantFromHost('MiTienda.MiDominio.COM', ROOT)).toBe('mitienda')
  })

  it('treats the apex domain as the platform, not a store', () => {
    expect(resolveTenantFromHost(ROOT, ROOT)).toBeNull()
  })

  it('treats reserved subdomains as the platform', () => {
    for (const sub of ['www', 'api', 'admin', 'app', 'panel', 'static', 'cdn', 'mail']) {
      expect(resolveTenantFromHost(`${sub}.${ROOT}`, ROOT)).toBeNull()
    }
  })

  it('ignores hosts nested more than one label deep', () => {
    expect(resolveTenantFromHost(`a.b.${ROOT}`, ROOT)).toBeNull()
  })

  it('returns null for an unrelated domain', () => {
    expect(resolveTenantFromHost('otrodominio.com', ROOT)).toBeNull()
  })

  /**
   * Security: matching on suffix alone would let anyone register
   * `midominio.com.evil.com` and have the app treat it as the `midominio` store,
   * serving that tenant's data on a host they control.
   */
  it('does not match a host that merely ends with something like the root domain', () => {
    expect(resolveTenantFromHost('midominio.com.evil.com', ROOT)).toBeNull()
    expect(resolveTenantFromHost('notmidominio.com', ROOT)).toBeNull()
    expect(resolveTenantFromHost('evilmidominio.com', ROOT)).toBeNull()
  })

  it('returns null when no root domain is configured, disabling subdomain mode', () => {
    expect(resolveTenantFromHost('mitienda.midominio.com', null)).toBeNull()
    expect(resolveTenantFromHost('mitienda.midominio.com', '')).toBeNull()
  })

  it('tolerates a root domain written with a leading dot', () => {
    expect(resolveTenantFromHost('mitienda.midominio.com', `.${ROOT}`)).toBe('mitienda')
  })

  it('works against localhost, which is how subdomains are tested locally', () => {
    expect(resolveTenantFromHost('mitienda.localhost', 'localhost')).toBe('mitienda')
    expect(resolveTenantFromHost('localhost', 'localhost')).toBeNull()
  })
})
