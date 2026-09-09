import { useCallback, useEffect } from 'react'
import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { getPublicStorefront } from '@/services/tenants.service'
import { setStorefrontTenant } from '@/services/api-client'
import { TENANT_SLUG_FROM_HOST, storefrontPath } from '@/config/storefront'
import { applyStorefrontTheme, clearStorefrontTheme } from '@/config/themes'
import { useCartStore } from '@/store/cart.store'
import { useBootstrapCustomerAuth } from '@/hooks/useBootstrapCustomerAuth'
import { useVisitTracking } from '@/hooks/useVisitTracking'
import { StorefrontHeader } from '@/components/storefront/StorefrontHeader'
import { FullPageSpinner } from '@/components/ui/Spinner'
import { NotFound } from '@/pages/NotFoundPage'
import type { StorefrontContext } from '@/hooks/useStorefront'
import type { PublicTenant } from '@/types/api'

/** Links to whichever store policies the merchant has actually published — a blank policy shows no link. */
function PolicyLinks({ tenant, path }: { tenant: PublicTenant; path: (subpath?: string) => string }) {
  const { t } = useTranslation()
  const links: [string, string][] = [
    ...(tenant.termsOfSaleContent ? [['/terms-of-sale', t('storefront.termsOfSale')] as [string, string]] : []),
    ...(tenant.shippingPolicyContent ? [['/shipping-policy', t('storefront.shippingPolicy')] as [string, string]] : []),
    ...(tenant.returnPolicyContent ? [['/return-policy', t('storefront.returnPolicy')] as [string, string]] : []),
    ...(tenant.privacyPolicyContent ? [['/privacy-policy', t('storefront.privacyPolicy')] as [string, string]] : []),
  ]
  if (links.length === 0) return null

  return (
    <p className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
      {links.map(([subpath, label]) => (
        <Link key={subpath} to={path(subpath)} className="text-gray-500 hover:text-gray-700 hover:underline">
          {label}
        </Link>
      ))}
    </p>
  )
}

export function PublicLayout() {
  const { slug: slugParam = '' } = useParams()
  // On a store subdomain the slug is the host, and there is no route param.
  const slug = TENANT_SLUG_FROM_HOST ?? slugParam
  const { t } = useTranslation()
  const location = useLocation()
  const setTenantSlug = useCartStore((s) => s.setTenantSlug)
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))

  const {
    data: tenant,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['storefront-tenant', slug],
    queryFn: () => getPublicStorefront(slug),
    enabled: !!slug,
    // A missing store is a settled answer, not a blip — retrying only delays the 404.
    retry: (failureCount, error) =>
      !(axios.isAxiosError(error) && error.response?.status === 404) && failureCount < 1,
  })

  useEffect(() => {
    setStorefrontTenant(slug)
    setTenantSlug(slug)
  }, [slug, setTenantSlug])

  // Declared after the effect above so, within this component, it always
  // commits second — setStorefrontTenant(slug) has already run by the time
  // this hook's own effect fires its `apiClient`-backed profile fetch.
  useBootstrapCustomerAuth(slug)
  useVisitTracking()

  // Runs before the early returns below, so it has to tolerate a tenant that
  // hasn't loaded. Cleared on unmount so leaving a storefront for the platform
  // in `/store/:slug` mode doesn't leave the store's colours behind.
  useEffect(() => {
    applyStorefrontTheme(tenant?.theme)
    return clearStorefrontTheme
  }, [tenant?.theme])

  const path = useCallback((subpath = '') => storefrontPath(slug, subpath), [slug])

  if (isLoading) return <FullPageSpinner />

  // Without this the query settles with no data and the layout spins forever.
  if (isError || !tenant) {
    return (
      <NotFound
        title={t('errors.storeNotFoundTitle')}
        body={t('errors.storeNotFoundBody')}
        actionLabel={t('errors.goHome')}
        actionTo="/"
      />
    )
  }

  const stripSlash = (value: string) => value.replace(/\/+$/, '')
  const isHome = stripSlash(location.pathname) === stripSlash(path())

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <StorefrontHeader
        tenant={tenant}
        cartCount={cartCount}
        homePath={path()}
        cartPath={path('/cart')}
        accountPath={path('/account')}
        loginPath={path('/login')}
        showHero={isHome}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet context={{ tenant, slug, path } satisfies StorefrontContext} />
      </main>

      <footer className="mt-8 border-t border-gray-200 bg-gray-50/60 py-8 text-center text-sm text-gray-500">
        <p className="font-medium text-gray-700">{tenant.name}</p>
        <p className="mt-1">
          © {new Date().getFullYear()} — {t('footer.rights')}
        </p>
        <PolicyLinks tenant={tenant} path={path} />
        <p className="mt-2 text-xs text-gray-400">{t('footer.poweredBy')}</p>
      </footer>
    </div>
  )
}
