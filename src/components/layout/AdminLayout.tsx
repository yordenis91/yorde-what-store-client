import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth.store'
import { useOrderNotificationsStore } from '@/store/order-notifications.store'
import { useOrderEvents } from '@/hooks/useOrderEvents'
import { logout as apiLogout } from '@/services/auth.service'
import { unlockNotificationSound } from '@/utils/notification-sound'
import { NotificationBell } from './NotificationBell'
import { SidebarShell, type SidebarNavItem } from './SidebarShell'

export function AdminLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const activeTenant = useAuthStore((s) => s.activeTenant)
  const clear = useAuthStore((s) => s.clear)
  const unseenOrders = useOrderNotificationsStore((s) => s.unseenCount)
  useOrderEvents()

  // Browsers suspend audio until a real user gesture — catch the first one
  // anywhere on the page so the chime has the best chance of being audible
  // well before the staff happens to click the bell itself.
  useEffect(() => {
    function unlock() {
      unlockNotificationSound()
      document.removeEventListener('pointerdown', unlock)
      document.removeEventListener('keydown', unlock)
    }
    document.addEventListener('pointerdown', unlock)
    document.addEventListener('keydown', unlock)
    return () => {
      document.removeEventListener('pointerdown', unlock)
      document.removeEventListener('keydown', unlock)
    }
  }, [])

  const navItems: SidebarNavItem[] = [
    { to: '/admin', label: 'nav.dashboard', end: true },
    { to: '/admin/products', label: 'nav.products' },
    { to: '/admin/orders', label: 'nav.orders', badge: unseenOrders },
    { to: '/admin/coupons', label: 'nav.coupons' },
    { to: '/admin/shipping', label: 'nav.shipping' },
    { to: '/admin/staff', label: 'nav.staff' },
    { to: '/admin/email-templates', label: 'nav.emailTemplates' },
    { to: '/admin/plans', label: 'nav.plans' },
    { to: '/admin/settings', label: 'nav.settings' },
  ]

  async function handleLogout() {
    try {
      await apiLogout()
    } finally {
      clear()
      navigate('/login')
    }
  }

  return (
    <SidebarShell
      brand={activeTenant?.name ?? t('app.name')}
      navItems={navItems}
      headerLeft={activeTenant?.slug}
      headerRight={<NotificationBell />}
      onLogout={() => void handleLogout()}
    />
  )
}
