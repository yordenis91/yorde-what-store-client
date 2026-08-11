import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { FullPageSpinner } from '@/components/ui/Spinner'

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)

  if (isBootstrapping) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
