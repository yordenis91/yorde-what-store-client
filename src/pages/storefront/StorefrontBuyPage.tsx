import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getPublishedProduct } from '@/services/products.service'
import { useStorefront } from '@/hooks/useStorefront'
import { useCartStore } from '@/store/cart.store'
import { resolveMediaUrl } from '@/services/api-client'
import { Spinner } from '@/components/ui/Spinner'

/**
 * Landing target of an external "Buy" button: puts the one product in an otherwise empty cart and
 * goes straight to checkout. Only for products that need no choice (no variants, one copy) — anything
 * else is sent to its product page, where the shopper picks.
 */
export function StorefrontBuyPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const { tenant, slug, path } = useStorefront()
  const setTenantSlug = useCartStore((s) => s.setTenantSlug)
  const clear = useCartStore((s) => s.clear)
  const addItem = useCartStore((s) => s.addItem)

  const { data: product, isError } = useQuery({
    queryKey: ['storefront-product', slug, id],
    queryFn: () => getPublishedProduct(slug, id),
    retry: false,
  })

  const isDigital = tenant.catalogType === 'DIGITAL'
  const direct = Boolean(product) && isDigital && !product!.hasVariants

  useEffect(() => {
    if (!product || !direct) return
    // The layout also calls setTenantSlug, but its effect runs after this one and would empty the
    // cart for a visitor arriving from another site; doing it first makes that call a no-op.
    setTenantSlug(slug)
    clear()
    const cover = product.images.find((i) => i.isCover) ?? product.images[0]
    addItem({
      productId: product.id,
      name: product.name,
      unitPrice: Number(product.price),
      quantity: 1,
      imageUrl: cover ? resolveMediaUrl(cover.url) : undefined,
    })
  }, [product, direct, slug, setTenantSlug, clear, addItem])

  if (isError) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-gray-600">{t('storefront.buyUnavailable')}</p>
        <Link to={path()} className="font-medium underline">
          {t('storefront.backToStore')}
        </Link>
      </div>
    )
  }

  if (product && !direct) return <Navigate to={path(`/product/${product.id}`)} replace />
  if (product && direct) return <Navigate to={path('/checkout')} replace />

  return (
    <div className="flex justify-center py-16">
      <Spinner className="h-8 w-8" />
    </div>
  )
}
