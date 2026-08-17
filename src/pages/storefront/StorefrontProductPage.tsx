import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getPublishedProduct } from '@/services/products.service'
import { useStorefront } from '@/hooks/useStorefront'
import { useCartStore } from '@/store/cart.store'
import { formatMoney } from '@/utils/format'
import { resolveMediaUrl } from '@/services/api-client'
import { BackLink } from '@/components/storefront/BackLink'
import { QuantityStepper } from '@/components/storefront/QuantityStepper'
import { Seo } from '@/components/storefront/Seo'
import { metaDescription } from '@/utils/seo'
import { CartIcon, CheckIcon } from '@/components/ui/icons'
import { Spinner } from '@/components/ui/Spinner'

export function StorefrontProductPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const { tenant, slug, path } = useStorefront()
  const addItem = useCartStore((s) => s.addItem)
  const [variantId, setVariantId] = useState<string | undefined>()
  const [quantity, setQuantity] = useState(1)
  const [activeImageId, setActiveImageId] = useState<string | undefined>()

  const { data: product, isLoading } = useQuery({
    queryKey: ['storefront-product', slug, id],
    queryFn: () => getPublishedProduct(slug, id),
  })

  const inCart = useCartStore((s) => s.items.find((i) => i.productId === id && i.variantId === variantId))

  if (isLoading || !product) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const hasVariants = product.hasVariants && product.variants.length > 0
  const variant = product.variants.find((v) => v.id === variantId)
  const price = Number(variant?.price ?? product.price)
  const stock = variant ? variant.quantity : product.quantity
  const cover = product.images.find((i) => i.isCover) ?? product.images[0]
  const activeImage = product.images.find((i) => i.id === activeImageId) ?? cover
  const symbol = tenant.currencySymbol
  const position = tenant.currencySymbolPosition as 'pre' | 'post'

  const needsVariant = hasVariants && !variantId
  // Quantities are only stock when the store tracks inventory; otherwise they
  // sit at their default of 0 and would read as sold out everywhere.
  const tracksInventory = tenant.tracksInventory
  const soldOut = tracksInventory && !needsVariant && stock <= 0

  function handleAddToCart() {
    addItem({
      productId: product!.id,
      variantId,
      name: product!.name,
      variantName: variant?.name,
      unitPrice: price,
      quantity,
      imageUrl: cover ? resolveMediaUrl(cover.url) : undefined,
      maxQuantity: tracksInventory ? stock : undefined,
    })
    // Deliberately stays on the page instead of jumping to the cart: the "go to
    // cart" link below appears once something is in it, so continuing to browse
    // and going to checkout are both one click away.
    toast.success(t('storefront.addedToCart'))
    setQuantity(1)
  }

  const coverUrl = cover ? new URL(resolveMediaUrl(cover.url), window.location.origin).href : null

  return (
    <div className="pb-24 lg:pb-0">
      <Seo
        type="product"
        title={`${product.name} — ${tenant.name}`}
        description={metaDescription(product.description, tenant.tagline)}
        image={coverUrl}
        siteName={tenant.name}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: metaDescription(product.description),
          ...(product.sku ? { sku: product.sku } : {}),
          ...(coverUrl ? { image: coverUrl } : {}),
          offers: {
            '@type': 'Offer',
            price: price.toFixed(2),
            priceCurrency: tenant.currency,
            url: `${window.location.origin}${window.location.pathname}`,
            availability: soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
            seller: { '@type': 'Organization', name: tenant.name },
          },
        }}
      />

      <BackLink fallbackTo={path()} label={t('storefront.backToStore')} className="mb-5" />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
            {activeImage ? (
              <img src={resolveMediaUrl(activeImage.url)} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300">
                <CartIcon className="h-12 w-12" />
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {product.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImageId(img.id)}
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition-colors ${
                    (activeImage?.id ?? cover?.id) === img.id
                      ? 'border-brand-600'
                      : 'border-gray-200 hover:border-brand-500/50'
                  }`}
                >
                  <img src={resolveMediaUrl(img.url)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{product.name}</h1>
          <p className="mt-2 text-2xl font-bold text-brand-700">{formatMoney(price, symbol, position)}</p>

          {tracksInventory && !needsVariant && (
            <p className="mt-2 text-sm">
              {soldOut ? (
                <span className="font-medium text-gray-400">{t('storefront.soldOut')}</span>
              ) : stock <= 5 ? (
                <span className="font-medium text-amber-600">{t('storefront.lowStock', { count: stock })}</span>
              ) : (
                <span className="font-medium text-emerald-600">{t('storefront.inStock')}</span>
              )}
            </p>
          )}

          {product.description && (
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-gray-600">{product.description}</p>
          )}

          {hasVariants && (
            <div className="mt-6">
              <span className="mb-2 block text-sm font-medium text-gray-700">{t('storefront.options')}</span>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setVariantId(v.id)
                      setQuantity(1)
                    }}
                    disabled={tracksInventory && v.quantity <= 0}
                    className={`rounded-lg border px-3 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:py-1.5 ${
                      variantId === v.id
                        ? 'border-brand-600 bg-brand-50 font-medium text-brand-700'
                        : 'border-gray-300 text-gray-700 hover:border-brand-500'
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              max={tracksInventory && !needsVariant ? Math.max(1, stock) : undefined}
              size="md"
              className="w-36"
            />
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={needsVariant || soldOut}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <CartIcon className="h-4.5 w-4.5" />
              {soldOut
                ? t('storefront.soldOut')
                : needsVariant
                  ? t('storefront.selectAnOption')
                  : t('storefront.addToCart')}
            </button>
          </div>

          {inCart && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-600 bg-brand-50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-brand-700">
                <CheckIcon className="h-4 w-4" />
                {t('storefront.inCart', { count: inCart.quantity })}
              </span>
              <Link to={path('/cart')} className="text-sm font-semibold text-brand-700 underline-offset-2 hover:underline">
                {t('storefront.viewCart')}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Always-reachable add-to-cart on mobile — the product info column above
          can run long (description, variants), pushing the inline button
          below the fold. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-gray-200 bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-gray-500">{product.name}</p>
          <p className="text-base font-bold text-brand-700">{formatMoney(price, symbol, position)}</p>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={needsVariant || soldOut}
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <CartIcon className="h-4.5 w-4.5" />
          {soldOut
            ? t('storefront.soldOut')
            : needsVariant
              ? t('storefront.selectAnOption')
              : t('storefront.addToCart')}
        </button>
      </div>
    </div>
  )
}
