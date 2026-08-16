import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { listPublishedProducts, listPublicCategories } from '@/services/products.service'
import { useStorefront } from '@/hooks/useStorefront'
import { formatMoney } from '@/utils/format'
import { resolveMediaUrl } from '@/services/api-client'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type SortOption = 'newest' | 'price_asc' | 'price_desc'

export function StorefrontHomePage() {
  const { t } = useTranslation()
  const { tenant, slug, path } = useStorefront()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [sort, setSort] = useState<SortOption>('newest')
  const [page, setPage] = useState(1)

  const { data: categories } = useQuery({
    queryKey: ['storefront-categories', slug],
    queryFn: () => listPublicCategories(slug),
    enabled: !!slug,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['storefront-products', slug, search, categoryId, sort, page],
    queryFn: () =>
      listPublishedProducts(slug, {
        page,
        limit: 12,
        search: search || undefined,
        categoryId: categoryId || undefined,
        sort,
      }),
  })

  const symbol = tenant.currencySymbol
  const position = tenant.currencySymbolPosition as 'pre' | 'post'

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
      <aside>
        {tenant.tagline && <p className="mb-4 text-sm text-gray-600">{tenant.tagline}</p>}
        <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Categories</p>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => {
              setCategoryId('')
              setPage(1)
            }}
            className={`rounded-lg px-2 py-1 text-left text-sm ${!categoryId ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            All
          </button>
          {categories?.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCategoryId(c.id)
                setPage(1)
              }}
              className={`rounded-lg px-2 py-1 text-left text-sm ${categoryId === c.id ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </aside>

      <div>
        <div className="mb-4 flex flex-wrap gap-3">
          <Input
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="max-w-xs"
          />
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">{t('common.loading')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {data?.items.map((product) => {
              const cover = product.images.find((i) => i.isCover) ?? product.images[0]
              return (
                <Link
                  key={product.id}
                  to={path(`/product/${product.id}`)}
                  className="group rounded-xl border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md"
                >
                  <div className="mb-3 aspect-square overflow-hidden rounded-lg bg-gray-100">
                    {cover && <img src={resolveMediaUrl(cover.url)} alt={product.name} className="h-full w-full object-cover" />}
                  </div>
                  <p className="text-sm font-medium text-gray-900 group-hover:text-brand-700">{product.name}</p>
                  <p className="mt-1 text-sm text-gray-600">{formatMoney(product.price, symbol, position)}</p>
                </Link>
              )
            })}
          </div>
        )}

        {data?.items.length === 0 && <Card className="text-center text-sm text-gray-500">No products found.</Card>}

        {data && data.meta.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ←
            </Button>
            <span className="text-sm text-gray-500">
              {page} / {data.meta.totalPages}
            </span>
            <Button variant="secondary" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
              →
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
