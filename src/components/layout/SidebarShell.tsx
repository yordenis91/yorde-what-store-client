import { useState, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

export interface SidebarNavItem {
  to: string
  label: string
  end?: boolean
}

interface SidebarShellProps {
  brand: ReactNode
  navItems: SidebarNavItem[]
  headerLeft?: ReactNode
  onLogout: () => void
}

/** Shared responsive sidebar shell (desktop static sidebar / mobile slide-in drawer) used by both the tenant admin and platform (super admin) layouts. */
export function SidebarShell({ brand, navItems, headerLeft, onLogout }: SidebarShellProps) {
  const { t } = useTranslation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-50">
      {mobileOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 sm:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col border-r border-gray-200 bg-white px-4 py-6 transition-transform duration-200 sm:static sm:z-auto sm:flex sm:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : ''
        }`}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <span className="text-lg font-bold text-brand-700">{brand}</span>
          <button
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="text-gray-400 hover:text-gray-600 sm:hidden"
          >
            ✕
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
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
          onClick={onLogout}
          className="rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          {t('nav.logout')}
        </button>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 sm:hidden"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="text-sm text-gray-500">{headerLeft}</div>
          </div>
          <LanguageSwitcher />
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
