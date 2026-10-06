import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from './auth.store'
import type { Tenant } from '@/types/api'

const tenant = (overrides: Partial<Tenant>) => ({ id: 't1', name: 'Shop', ...overrides }) as Tenant

describe('mergeTenant', () => {
  beforeEach(() => {
    useAuthStore.setState({ activeTenant: null, tenants: [] })
  })

  it('keeps the role the session already knows when the update does not carry one', () => {
    useAuthStore.setState({
      activeTenant: tenant({ myRole: 'OWNER' }),
      tenants: [tenant({ myRole: 'OWNER' }), tenant({ id: 't2', myRole: 'STAFF' })],
    })

    useAuthStore.getState().mergeTenant(tenant({ name: 'Renamed' }))

    const state = useAuthStore.getState()
    expect(state.activeTenant).toMatchObject({ name: 'Renamed', myRole: 'OWNER' })
    expect(state.tenants[0]).toMatchObject({ name: 'Renamed', myRole: 'OWNER' })
    expect(state.tenants[1]).toMatchObject({ id: 't2', name: 'Shop', myRole: 'STAFF' })
  })

  it('leaves another store active when a different one is updated', () => {
    useAuthStore.setState({ activeTenant: tenant({ id: 't2', myRole: 'OWNER' }), tenants: [] })

    useAuthStore.getState().mergeTenant(tenant({ name: 'Other' }))

    expect(useAuthStore.getState().activeTenant).toMatchObject({ id: 't2', name: 'Shop' })
  })
})
