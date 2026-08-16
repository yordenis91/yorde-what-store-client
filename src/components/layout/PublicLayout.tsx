import { useCallback, useEffect } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { getPublicStorefront } from '@/services/tenants.service'
import { setStorefrontTenant } from '@/services/api-client'
import { TENANT_SLUG_FROM_HOST, storefrontPath } from '@/config/storefront'
import { applyStorefrontTheme, clearStorefrontTheme } from '@/config/themes'
import { useCartStore } from '@/store/cart.store'
import { StorefrontHeader } from '@/components/storefront/StorefrontHeader'
import { FullPageSpinner } from '@/components/ui/Spinner'
import { NotFound } from '@/pages/NotFoundPage'
import type { StorefrontContext } from '@/hooks/useStorefront'

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
        <p className="mt-2 text-xs text-gray-400">{t('footer.poweredBy')}</p>
      </footer>
    </div>
  )
}
