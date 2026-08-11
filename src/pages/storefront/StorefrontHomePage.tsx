import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { listPublishedProducts } from '@/services/products.service'
import { useStorefrontTenant } from '@/hooks/useStorefrontTenant'
import { formatMoney } from '@/utils/format'
import { Card } from '@/components/ui/Card'

export function StorefrontHomePage() {
  const { slug = '' } = useParams()
  const { t } = useTranslation()
  const tenant = useStorefrontTenant()

  const { data, isLoading } = useQuery({
    queryKey: ['storefront-products', slug],
    queryFn: () => listPublishedProducts(slug, { page: 1, limit: 24 }),
  })

  if (isLoading) return <p className="text-sm text-gray-500">{t('common.loading')}</p>

  return (
    <div>
      {tenant.tagline && <p className="mb-6 text-lg text-gray-600">{tenant.tagline}</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {data?.items.map((product) => {
          const cover = product.images.find((i) => i.isCover) ?? product.images[0]
          return (
            <Link
              key={product.id}
              to={`/store/${slug}/product/${product.id}`}
              className="group rounded-xl border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md"
            >
              <div className="mb-3 aspect-square overflow-hidden rounded-lg bg-gray-100">
                {cover && <img src={cover.url} alt={product.name} className="h-full w-full object-cover" />}
              </div>
              <p className="text-sm font-medium text-gray-900 group-hover:text-brand-700">{product.name}</p>
              <p className="mt-1 text-sm text-gray-600">
                {formatMoney(product.price, tenant.currencySymbol, tenant.currencySymbolPosition as 'pre' | 'post')}
              </p>
            </Link>
          )
        })}
      </div>
      {data?.items.length === 0 && (
        <Card className="text-center text-sm text-gray-500">No products yet.</Card>
      )}
    </div>
  )
}
