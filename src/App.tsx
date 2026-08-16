import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { FullPageSpinner } from '@/components/ui/Spinner'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PlatformRoute } from '@/components/layout/PlatformRoute'
import { LandingPage } from '@/pages/LandingPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { TENANT_SLUG_FROM_HOST } from '@/config/storefront'
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
const CouponsPage = lazy(() => import('@/pages/admin/CouponsPage').then((m) => ({ default: m.CouponsPage })))
const ShippingPage = lazy(() => import('@/pages/admin/ShippingPage').then((m) => ({ default: m.ShippingPage })))

const PlatformDashboardPage = lazy(() =>
  import('@/pages/platform/PlatformDashboardPage').then((m) => ({ default: m.PlatformDashboardPage })),
)
const PlatformTenantsPage = lazy(() =>
  import('@/pages/platform/PlatformTenantsPage').then((m) => ({ default: m.PlatformTenantsPage })),
)
const PlatformPlansPage = lazy(() =>
  import('@/pages/platform/PlatformPlansPage').then((m) => ({ default: m.PlatformPlansPage })),
)
const PlatformUpgradeRequestsPage = lazy(() =>
  import('@/pages/platform/PlatformUpgradeRequestsPage').then((m) => ({ default: m.PlatformUpgradeRequestsPage })),
)

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

/**
 * Storefront pages, mounted under whatever path the current host implies: the
 * root on a store subdomain, `/store/:slug` on the platform host.
 */
const storefrontRoutes = (
  <>
    <Route index element={<StorefrontHomePage />} />
    <Route path="product/:id" element={<StorefrontProductPage />} />
    <Route path="cart" element={<StorefrontCartPage />} />
    <Route path="checkout" element={<StorefrontCheckoutPage />} />
    <Route path="order-confirmed/:id" element={<StorefrontOrderConfirmedPage />} />
  </>
)

/**
 * A store subdomain serves that store and nothing else — the admin, the auth
 * pages and the platform panel live on the platform host. Keeping them off the
 * store's own domain means a customer can never wander into them.
 */
function StorefrontApp() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="/" element={<PublicLayout />}>{storefrontRoutes}</Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  // Nothing to restore on a store subdomain: storefront checkout is guest-only,
  // so skipping the bootstrap saves a doomed refresh call on every visit.
  const isBootstrapping = useBootstrapAuth({ enabled: TENANT_SLUG_FROM_HOST === null })

  if (isBootstrapping) return <FullPageSpinner />
  if (TENANT_SLUG_FROM_HOST) return <StorefrontApp />

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
            <Route path="coupons" element={<CouponsPage />} />
            <Route path="shipping" element={<ShippingPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="settings" element={<StoreSettingsPage />} />
          </Route>
        </Route>

        <Route element={<PlatformRoute />}>
          <Route path="/platform" element={<SuperAdminLayout />}>
            <Route index element={<PlatformDashboardPage />} />
            <Route path="tenants" element={<PlatformTenantsPage />} />
            <Route path="plans" element={<PlatformPlansPage />} />
            <Route path="upgrade-requests" element={<PlatformUpgradeRequestsPage />} />
          </Route>
        </Route>

        {/* Kept alongside subdomain mode: existing links stay valid, and it is
            the only way to reach a store when no root domain is configured. */}
        <Route path="/store/:slug" element={<PublicLayout />}>
          {storefrontRoutes}
        </Route>

        {/* Shows a 404 instead of bouncing to the landing page, which looked like
            the link had worked and left no trace of the bad URL. */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
