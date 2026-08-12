import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { logout as apiLogout } from '@/services/auth.service'
import { SidebarShell } from './SidebarShell'

const navItems = [
  { to: '/platform', label: 'nav.dashboard', end: true },
  { to: '/platform/tenants', label: 'nav.tenants' },
  { to: '/platform/plans', label: 'nav.plans' },
  { to: '/platform/upgrade-requests', label: 'nav.upgradeRequests' },
]

export function SuperAdminLayout() {
  const navigate = useNavigate()
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
    <SidebarShell brand="Platform Admin" navItems={navItems} headerLeft="Super Admin" onLogout={() => void handleLogout()} />
  )
}
