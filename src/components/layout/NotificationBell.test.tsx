import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { useOrderNotificationsStore } from '@/store/order-notifications.store'
import type { Tenant } from '@/types/api'
import { NotificationBell } from './NotificationBell'

const isNotificationSoundMuted = vi.fn(() => false)
const setNotificationSoundMuted = vi.fn()
const unlockNotificationSound = vi.fn()
vi.mock('@/utils/notification-sound', () => ({
  isNotificationSoundMuted: () => isNotificationSoundMuted(),
  setNotificationSoundMuted: (m: boolean) => setNotificationSoundMuted(m),
  unlockNotificationSound: () => unlockNotificationSound(),
}))

function order(id: string, overrides: Partial<{ orderNumber: string; customerName: string; grandTotal: number }> = {}) {
  return {
    id,
    orderNumber: overrides.orderNumber ?? `ORD-${id}`,
    customerName: overrides.customerName ?? 'Jane Doe',
    grandTotal: overrides.grandTotal ?? 42,
    currency: 'USD',
    receivedAt: Date.now(),
  }
}

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  isNotificationSoundMuted.mockReturnValue(false)
  useOrderNotificationsStore.setState({ unseenCount: 0, recent: [] })
  useAuthStore.setState({
    activeTenant: { currencySymbol: '$', currencySymbolPosition: 'pre' } as unknown as Tenant,
  })
})

describe('NotificationBell', () => {
  it('shows no badge when there are no unseen orders', () => {
    renderBell()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('shows the unseen count as a badge, capped at 99+', () => {
    useOrderNotificationsStore.setState({ unseenCount: 3, recent: [order('1')] })
    renderBell()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('caps the badge display at 99+', () => {
    useOrderNotificationsStore.setState({ unseenCount: 150, recent: [] })
    renderBell()
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('opens a dropdown listing recent orders when clicked', async () => {
    useOrderNotificationsStore.setState({
      unseenCount: 1,
      recent: [order('1', { orderNumber: 'ORD-A1', customerName: 'Alice' })],
    })
    renderBell()

    expect(screen.queryByText('ORD-A1')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Notifications' }))

    expect(screen.getByText('ORD-A1')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(unlockNotificationSound).toHaveBeenCalled()
  })

  it('shows an empty state when there are no recent orders', async () => {
    renderBell()
    await userEvent.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(screen.getByText('No new orders.')).toBeInTheDocument()
  })

  it('clears the store when "View all orders" is clicked', async () => {
    useOrderNotificationsStore.setState({ unseenCount: 2, recent: [order('1'), order('2')] })
    renderBell()

    await userEvent.click(screen.getByRole('button', { name: 'Notifications' }))
    await userEvent.click(screen.getByText('View all orders'))

    expect(useOrderNotificationsStore.getState().unseenCount).toBe(0)
    expect(useOrderNotificationsStore.getState().recent).toEqual([])
  })

  it('toggles the mute preference', async () => {
    renderBell()
    await userEvent.click(screen.getByRole('button', { name: 'Notifications' }))

    await userEvent.click(screen.getByText('Mute sound'))
    expect(setNotificationSoundMuted).toHaveBeenCalledWith(true)
    expect(screen.getByText('Unmute sound')).toBeInTheDocument()
  })
})
