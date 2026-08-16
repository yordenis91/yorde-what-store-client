import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { resolveMediaUrl } from '@/services/api-client'
import { useCartStore } from '@/store/cart.store'
import { formatMoney } from '@/utils/format'
import { CartIcon, CheckIcon, MinusIcon, PlusIcon } from '@/components/ui/icons'
import type { Product } from '@/types/api'

interface ProductCardProps {
  product: Product
  /** Link to this product's own page. */
  to: string
  symbol: string
  position: 'pre' | 'post'
}

export function ProductCard({ product, to, symbol, position }: ProductCardProps) {
  const { t } = useTranslation()
  const addItem = useCartStore((s) => s.addItem)
  // Reference from the store's array, so this selector is referentially stable.
  const inCart = useCartStore((s) => s.items.find((i) => i.productId === product.id && !i.variantId))
  const [quantity, setQuantity] = useState(1)

  const cover = product.images.find((i) => i.isCover) ?? product.images[0]
  // Variants need a choice the card can't offer, so those go to the product page.
  const needsVariantChoice = product.hasVariants && product.variants.length > 0
  const soldOut = !needsVariantChoice && product.quantity <= 0
  const max = needsVariantChoice ? Infinity : Math.max(1, product.quantity)

  function handleAdd() {
    addItem({
      productId: product.id,
      name: product.name,
      unitPrice: Number(product.price),
      quantity,
      imageUrl: cover ? resolveMediaUrl(cover.url) : undefined,
      maxQuantity: product.quantity,
    })
    setQuantity(1)
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-600/5">
      <Link to={to} className="block aspect-square overflow-hidden bg-gray-100">
        {cover ? (
          <img
            src={resolveMediaUrl(cover.url)}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <CartIcon className="h-8 w-8" />
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="flex-1">
          <Link to={to} className="line-clamp-2 text-sm font-medium text-gray-900 transition-colors hover:text-brand-700">
            {product.name}
          </Link>
          <p className="mt-1 text-base font-semibold text-brand-700">
            {formatMoney(product.price, symbol, position)}
          </p>
        </div>

        {needsVariantChoice ? (
          <Link
            to={to}
            className="flex items-center justify-center rounded-lg border border-brand-600 px-3 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
          >
            {t('storefront.chooseOptions')}
          </Link>
        ) : soldOut ? (
          <span className="flex items-center justify-center rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-400">
            {t('storefront.soldOut')}
          </span>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-1">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label={t('storefront.decreaseQuantity')}
                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <MinusIcon className="h-4 w-4" />
              </button>
              <span className="min-w-6 text-center text-sm font-medium tabular-nums text-gray-900">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(max, q + 1))}
                disabled={quantity >= max}
                aria-label={t('storefront.increaseQuantity')}
                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                inCart
                  ? 'border border-brand-600 bg-brand-50 text-brand-700 hover:bg-brand-100'
                  : 'bg-brand-600 text-white hover:bg-brand-700'
              }`}
            >
              {inCart ? (
                <>
                  <CheckIcon className="h-4 w-4" />
                  {t('storefront.inCart', { count: inCart.quantity })}
                </>
              ) : (
                <>
                  <CartIcon className="h-4 w-4" />
                  {t('storefront.addToCart')}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
