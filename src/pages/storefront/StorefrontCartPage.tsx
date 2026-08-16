import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStorefront } from '@/hooks/useStorefront'
import { useCartStore } from '@/store/cart.store'
import { formatMoney } from '@/utils/format'
import { BackLink } from '@/components/storefront/BackLink'
import { QuantityStepper } from '@/components/storefront/QuantityStepper'
import { CartIcon, TrashIcon } from '@/components/ui/icons'

export function StorefrontCartPage() {
  const { t } = useTranslation()
  const { tenant, path } = useStorefront()
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)

  const symbol = tenant.currencySymbol
  const position = tenant.currencySymbolPosition as 'pre' | 'post'
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const unitCount = items.reduce((sum, i) => sum + i.quantity, 0)

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <CartIcon className="h-7 w-7" />
        </span>
        <p className="mt-4 text-lg font-medium text-gray-900">{t('storefront.cartEmpty')}</p>
        <p className="mt-1 text-sm text-gray-500">{t('storefront.cartEmptyHint')}</p>
        <Link
          to={path()}
          className="mt-6 inline-flex items-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          {t('storefront.continueShopping')}
        </Link>
      </div>
    )
  }

  return (
    <div>
      <BackLink fallbackTo={path()} label={t('storefront.continueShopping')} className="mb-5" />

      <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('nav.cart')}</h1>
      <p className="mt-1 text-sm text-gray-500">{t('storefront.itemCount', { count: unitCount })}</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {items.map((item) => {
            const productPath = path(`/product/${item.productId}`)
            return (
              <div key={`${item.productId}-${item.variantId ?? ''}`} className="flex gap-4 p-4">
                <Link
                  to={productPath}
                  className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-gray-300">
                      <CartIcon className="h-6 w-6" />
                    </span>
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={productPath}
                        className="block truncate text-sm font-medium text-gray-900 transition-colors hover:text-brand-700"
                      >
                        {item.name}
                      </Link>
                      {item.variantName && <p className="text-xs text-gray-500">{item.variantName}</p>}
                      <p className="mt-0.5 text-xs text-gray-500">
                        {formatMoney(item.unitPrice, symbol, position)} {t('storefront.each')}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId, item.variantId)}
                      aria-label={t('storefront.removeItem')}
                      title={t('storefront.removeItem')}
                      className="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <QuantityStepper
                      value={item.quantity}
                      onChange={(value) => updateQuantity(item.productId, item.variantId, value)}
                      max={item.maxQuantity && item.maxQuantity > 0 ? item.maxQuantity : undefined}
                      className="w-28"
                    />
                    <span className="text-sm font-semibold tabular-nums text-gray-900">
                      {formatMoney(item.unitPrice * item.quantity, symbol, position)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-gray-900">{t('storefront.orderSummary')}</h2>
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>{t('storefront.subtotal')}</span>
              <span className="tabular-nums">{formatMoney(subtotal, symbol, position)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-base font-semibold text-gray-900">
              <span>{t('storefront.total')}</span>
              <span className="tabular-nums">{formatMoney(subtotal, symbol, position)}</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">{t('storefront.extrasAtCheckout')}</p>

            <Link
              to={path('/checkout')}
              className="mt-5 flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              {t('storefront.checkout')}
            </Link>
            <Link
              to={path()}
              className="mt-3 block text-center text-sm font-medium text-gray-500 transition-colors hover:text-brand-700"
            >
              {t('storefront.continueShopping')}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
