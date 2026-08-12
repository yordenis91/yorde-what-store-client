import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth.store'
import { logout as apiLogout } from '@/services/auth.service'
import { SidebarShell } from './SidebarShell'

const navItems = [
  { to: '/admin', label: 'nav.dashboard', end: true },
  { to: '/admin/products', label: 'nav.products' },
  { to: '/admin/orders', label: 'nav.orders' },
  { to: '/admin/coupons', label: 'nav.coupons' },
  { to: '/admin/shipping', label: 'nav.shipping' },
  { to: '/admin/staff', label: 'nav.staff' },
  { to: '/admin/plans', label: 'nav.plans' },
  { to: '/admin/settings', label: 'nav.settings' },
]

export function AdminLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const activeTenant = useAuthStore((s) => s.activeTenant)
  const clear = useAuthStore((s) => s.clear)

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
      onLogout={() => void handleLogout()}
    />
  )
}
