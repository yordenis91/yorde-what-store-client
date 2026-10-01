import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { listPublishedProducts, listPublicCategories } from '@/services/products.service'
import { useStorefront } from '@/hooks/useStorefront'
import { resolveMediaUrl } from '@/services/api-client'
import type { Product } from '@/types/api'
import { ProductCard } from '@/components/storefront/ProductCard'
import { Seo } from '@/components/storefront/Seo'
import { metaDescription } from '@/utils/seo'
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

  // The unfiltered front page lists every product under its category title. The API
  // paginates (100 max per request), so grouping needs the whole catalogue in one
  // response; any filter, or a catalogue too big for one response, falls back to the
  // paginated flat grid.
  const wantsGroups = !categoryId && !search
  const limit = wantsGroups ? 100 : 12

  const { data, isLoading } = useQuery({
    queryKey: ['storefront-products', slug, search, categoryId, sort, page, limit],
    queryFn: () =>
      listPublishedProducts(slug, {
        page,
        limit,
        search: search || undefined,
        categoryId: categoryId || undefined,
        sort,
      }),
  })

  const sections = useMemo(() => {
    if (!wantsGroups || !data || data.meta.totalPages > 1) return null
    const groups = (categories ?? [])
      .map((c) => ({
        id: c.id,
        name: c.name,
        products: data.items.filter((p) => p.categories.some((pc) => pc.category.id === c.id)),
      }))
      .filter((g) => g.products.length > 0)
    const uncategorized = data.items.filter((p) => p.categories.length === 0)
    // Only worth a heading when it sits next to real categories.
    if (uncategorized.length > 0) {
      groups.push({ id: 'uncategorized', name: groups.length > 0 ? t('storefront.otherProducts') : '', products: uncategorized })
    }
    return groups
  }, [wantsGroups, data, categories, t])

  const selectedCategory = categories?.find((c) => c.id === categoryId)

  const symbol = tenant.currencySymbol
  const position = tenant.currencySymbolPosition as 'pre' | 'post'

  function selectCategory(id: string) {
    setCategoryId(id)
    setPage(1)
  }

  function renderGrid(products: Product[]) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            to={path(`/product/${product.id}`)}
            symbol={symbol}
            position={position}
            tracksInventory={tenant.tracksInventory}
          />
        ))}
      </div>
    )
  }

  const social = tenant.bannerUrl ?? tenant.logoUrl

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[210px_1fr]">
      <Seo
        title={tenant.tagline ? `${tenant.name} — ${tenant.tagline}` : tenant.name}
        description={metaDescription(tenant.about, tenant.tagline)}
        image={social ? new URL(resolveMediaUrl(social), window.location.origin).href : null}
        siteName={tenant.name}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Store',
          name: tenant.name,
          description: metaDescription(tenant.about, tenant.tagline),
          url: `${window.location.origin}${window.location.pathname}`,
          ...(tenant.logoUrl
            ? { logo: new URL(resolveMediaUrl(tenant.logoUrl), window.location.origin).href }
            : {}),
          ...(Object.values(tenant.socialLinks).filter(Boolean).length > 0
            ? { sameAs: Object.values(tenant.socialLinks).filter(Boolean) }
            : {}),
        }}
      />
      <aside className="order-2 md:order-1">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {t('storefront.categories')}
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
          <CategoryButton active={!categoryId} onClick={() => selectCategory('')}>
            {t('storefront.allCategories')}
          </CategoryButton>
          {categories?.map((c) => (
            <CategoryButton key={c.id} active={categoryId === c.id} onClick={() => selectCategory(c.id)}>
              {c.name}
            </CategoryButton>
          ))}
        </div>
      </aside>

      <div className="order-1 md:order-2">
        <div className="mb-5 flex flex-wrap gap-3">
          <Input
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="max-w-xs flex-1"
          />
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
          >
            <option value="newest">{t('storefront.sortNewest')}</option>
            <option value="price_asc">{t('storefront.sortPriceAsc')}</option>
            <option value="price_desc">{t('storefront.sortPriceDesc')}</option>
          </select>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">{t('common.loading')}</p>
        ) : sections ? (
          <div className="flex flex-col gap-10">
            {sections.map((g) => (
              <section key={g.id} aria-labelledby={g.name ? `cat-${g.id}` : undefined}>
                {g.name && (
                  <h2
                    id={`cat-${g.id}`}
                    className="mb-4 border-b border-gray-200 pb-2 text-xl font-bold tracking-tight text-gray-900"
                  >
                    {g.name}
                  </h2>
                )}
                {renderGrid(g.products)}
              </section>
            ))}
          </div>
        ) : (
          <>
            {selectedCategory && (
              <h2 className="mb-4 border-b border-gray-200 pb-2 text-xl font-bold tracking-tight text-gray-900">
                {selectedCategory.name}
              </h2>
            )}
            {renderGrid(data?.items ?? [])}
          </>
        )}

        {data?.items.length === 0 && (
          <Card className="text-center text-sm text-gray-500">{t('storefront.noProducts')}</Card>
        )}

        {data && data.meta.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ←
            </Button>
            <span className="text-sm tabular-nums text-gray-500">
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

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors md:py-1.5 ${
        active ? 'bg-brand-600 font-medium text-white' : 'text-gray-600 hover:bg-brand-50 hover:text-brand-700'
      }`}
    >
      {children}
    </button>
  )
}
