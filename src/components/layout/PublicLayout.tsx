import { useEffect } from 'react'
import { Link, Outlet, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getPublicStorefront } from '@/services/tenants.service'
import { setStorefrontTenant } from '@/services/api-client'
import { useCartStore } from '@/store/cart.store'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { FullPageSpinner } from '@/components/ui/Spinner'

export function PublicLayout() {
  const { slug = '' } = useParams()
  const { t } = useTranslation()
  const setTenantSlug = useCartStore((s) => s.setTenantSlug)
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['storefront-tenant', slug],
    queryFn: () => getPublicStorefront(slug),
    enabled: !!slug,
  })

  useEffect(() => {
    setStorefrontTenant(slug)
    setTenantSlug(slug)
  }, [slug, setTenantSlug])

  if (isLoading || !tenant) return <FullPageSpinner />

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to={`/store/${slug}`} className="flex items-center gap-2">
            {tenant.logoUrl && <img src={tenant.logoUrl} alt={tenant.name} className="h-8 w-8 rounded" />}
            <span className="text-lg font-bold text-gray-900">{tenant.name}</span>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link to={`/store/${slug}/cart`} className="relative text-sm font-medium text-gray-700">
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
        <Outlet context={{ tenant }} />
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
