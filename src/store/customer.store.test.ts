import { beforeEach, describe, expect, it } from 'vitest'
import { useCustomerStore } from './customer.store'
import type { Customer } from '@/types/api'

const shopper: Customer = { id: 'c1', name: 'Ana', email: 'ana@test.com', phone: null, createdAt: '2026-01-01' }

const store = () => useCustomerStore.getState()

beforeEach(() => {
  useCustomerStore.setState({ tenantSlug: null, customer: null, accessToken: null, isBootstrapping: true })
})

describe('setSession', () => {
  it('stores the customer and access token together', () => {
    store().setSession({ customer: shopper, accessToken: 'token-1' })

    expect(store().customer).toEqual(shopper)
    expect(store().accessToken).toBe('token-1')
  })
})

describe('setTenantSlug', () => {
  /**
   * Same reasoning as cart.store's equivalent test: in `/store/:slug`
   * fallback mode multiple tenants share one browser tab, so a session for
   * tenant A must not leak into tenant B's page.
   */
  it('clears the session when the shopper moves to a different store', () => {
    store().setTenantSlug('store-a')
    store().setSession({ customer: shopper, accessToken: 'token-1' })

    store().setTenantSlug('store-b')

    expect(store().customer).toBeNull()
    expect(store().accessToken).toBeNull()
    expect(store().tenantSlug).toBe('store-b')
  })

  it('leaves the session alone when the same store is set again', () => {
    store().setTenantSlug('store-a')
    store().setSession({ customer: shopper, accessToken: 'token-1' })

    store().setTenantSlug('store-a')

    expect(store().customer).toEqual(shopper)
  })
})

describe('clear', () => {
  it('drops the session but keeps the store slug', () => {
    store().setTenantSlug('store-a')
    store().setSession({ customer: shopper, accessToken: 'token-1' })

    store().clear()

    expect(store().customer).toBeNull()
    expect(store().accessToken).toBeNull()
    expect(store().tenantSlug).toBe('store-a')
  })
})
