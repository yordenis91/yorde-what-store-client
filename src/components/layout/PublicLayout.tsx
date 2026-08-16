import { useCallback, useEffect } from 'react'
import { Link, Outlet, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { getPublicStorefront } from '@/services/tenants.service'
import { resolveMediaUrl, setStorefrontTenant } from '@/services/api-client'
import { TENANT_SLUG_FROM_HOST, storefrontPath } from '@/config/storefront'
import { applyStorefrontTheme, clearStorefrontTheme } from '@/config/themes'
import { useCartStore } from '@/store/cart.store'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { FullPageSpinner } from '@/components/ui/Spinner'
import { NotFound } from '@/pages/NotFoundPage'
import type { StorefrontContext } from '@/hooks/useStorefront'

export function PublicLayout() {
  const { slug: slugParam = '' } = useParams()
  // On a store subdomain the slug is the host, and there is no route param.
  const slug = TENANT_SLUG_FROM_HOST ?? slugParam
  const { t } = useTranslation()
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

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to={path()} className="flex items-center gap-2">
            {tenant.logoUrl && (
              <img src={resolveMediaUrl(tenant.logoUrl)} alt={tenant.name} className="h-8 w-8 rounded" />
            )}
            <span className="text-lg font-bold text-gray-900">{tenant.name}</span>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link to={path('/cart')} className="relative text-sm font-medium text-gray-700">
              {t('nav.cart')}
              {cartCount > 0 && (
                <span className="absolute -right-3 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet context={{ tenant, slug, path } satisfies StorefrontContext} />
      </main>

      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        <p>
          © {new Date().getFullYear()} {tenant.name} — {t('footer.rights')}
        </p>
        <p className="mt-1 text-xs text-gray-400">{t('footer.poweredBy')}</p>
      </footer>
    </div>
  )
}
