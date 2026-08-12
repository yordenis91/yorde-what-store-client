import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { FullPageSpinner } from '@/components/ui/Spinner'

/** Guards platform (super admin) routes (`/platform/*`). */
export function PlatformRoute() {
  const user = useAuthStore((s) => s.user)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)

  if (isBootstrapping) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (user.globalRole !== 'SUPER_ADMIN') return <Navigate to="/admin" replace />
  return <Outlet />
}
