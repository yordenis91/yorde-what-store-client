import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth.store'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { logout as apiLogout } from '@/services/auth.service'

const navItems = [
  { to: '/admin', label: 'nav.dashboard', end: true },
  { to: '/admin/products', label: 'nav.products' },
  { to: '/admin/orders', label: 'nav.orders' },
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
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white px-4 py-6 sm:flex">
        <div className="mb-8 px-2 text-lg font-bold text-brand-700">{activeTenant?.name ?? t('app.name')}</div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {t(item.label)}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => void handleLogout()}
          className="rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          {t('nav.logout')}
        </button>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <div className="text-sm text-gray-500">{activeTenant?.slug}</div>
          <LanguageSwitcher />
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
