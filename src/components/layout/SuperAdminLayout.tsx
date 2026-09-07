import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { logout as apiLogout } from '@/services/auth.service'
import { CategoryCatalogIcon, DashboardIcon, PlansIcon, TenantsIcon, UpgradeRequestsIcon } from './NavIcons'
import { SidebarShell } from './SidebarShell'

const navItems = [
  { to: '/platform', label: 'nav.dashboard', end: true, icon: <DashboardIcon /> },
  { to: '/platform/tenants', label: 'nav.tenants', icon: <TenantsIcon /> },
  { to: '/platform/plans', label: 'nav.plans', icon: <PlansIcon /> },
  { to: '/platform/category-templates', label: 'nav.categoryTemplates', icon: <CategoryCatalogIcon /> },
  { to: '/platform/upgrade-requests', label: 'nav.upgradeRequests', icon: <UpgradeRequestsIcon /> },
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
