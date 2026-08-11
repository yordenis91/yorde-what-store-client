import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { FullPageSpinner } from '@/components/ui/Spinner'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { LandingPage } from '@/pages/LandingPage'
import { useBootstrapAuth } from '@/hooks/useBootstrapAuth'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const TwoFactorPage = lazy(() => import('@/pages/auth/TwoFactorPage').then((m) => ({ default: m.TwoFactorPage })))

const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const ProductsListPage = lazy(() => import('@/pages/admin/ProductsListPage').then((m) => ({ default: m.ProductsListPage })))
const ProductFormPage = lazy(() => import('@/pages/admin/ProductFormPage').then((m) => ({ default: m.ProductFormPage })))
const OrdersListPage = lazy(() => import('@/pages/admin/OrdersListPage').then((m) => ({ default: m.OrdersListPage })))
const OrderDetailPage = lazy(() => import('@/pages/admin/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })))
const StoreSettingsPage = lazy(() => import('@/pages/admin/StoreSettingsPage').then((m) => ({ default: m.StoreSettingsPage })))
const StaffPage = lazy(() => import('@/pages/admin/StaffPage').then((m) => ({ default: m.StaffPage })))
const PlansPage = lazy(() => import('@/pages/admin/PlansPage').then((m) => ({ default: m.PlansPage })))

const StorefrontHomePage = lazy(() =>
  import('@/pages/storefront/StorefrontHomePage').then((m) => ({ default: m.StorefrontHomePage })),
)
const StorefrontProductPage = lazy(() =>
  import('@/pages/storefront/StorefrontProductPage').then((m) => ({ default: m.StorefrontProductPage })),
)
const StorefrontCartPage = lazy(() =>
  import('@/pages/storefront/StorefrontCartPage').then((m) => ({ default: m.StorefrontCartPage })),
)
const StorefrontCheckoutPage = lazy(() =>
  import('@/pages/storefront/StorefrontCheckoutPage').then((m) => ({ default: m.StorefrontCheckoutPage })),
)
const StorefrontOrderConfirmedPage = lazy(() =>
  import('@/pages/storefront/StorefrontOrderConfirmedPage').then((m) => ({ default: m.StorefrontOrderConfirmedPage })),
)

export default function App() {
  const isBootstrapping = useBootstrapAuth()

  if (isBootstrapping) return <FullPageSpinner />

  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/2fa" element={<TwoFactorPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="products" element={<ProductsListPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/:id" element={<ProductFormPage />} />
            <Route path="orders" element={<OrdersListPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="settings" element={<StoreSettingsPage />} />
          </Route>
        </Route>

        <Route path="/store/:slug" element={<PublicLayout />}>
          <Route index element={<StorefrontHomePage />} />
          <Route path="product/:id" element={<StorefrontProductPage />} />
          <Route path="cart" element={<StorefrontCartPage />} />
          <Route path="checkout" element={<StorefrontCheckoutPage />} />
          <Route path="order-confirmed/:id" element={<StorefrontOrderConfirmedPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
