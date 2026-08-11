import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStorefrontTenant } from '@/hooks/useStorefrontTenant'
import { useCartStore } from '@/store/cart.store'
import { formatMoney } from '@/utils/format'
import { Button } from '@/components/ui/Button'

export function StorefrontCartPage() {
  const { slug = '' } = useParams()
  const { t } = useTranslation()
  const tenant = useStorefrontTenant()
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)

  const symbol = tenant.currencySymbol
  const position = tenant.currencySymbolPosition as 'pre' | 'post'
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

  if (items.length === 0) {
    return (
      <div className="text-center">
        <p className="mb-4 text-gray-500">{t('storefront.cartEmpty')}</p>
        <Link to={`/store/${slug}`}>
          <Button variant="secondary">{t('storefront.continueShopping')}</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('nav.cart')}</h1>
      <div className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {items.map((item) => (
          <div key={`${item.productId}-${item.variantId ?? ''}`} className="flex items-center gap-3 p-4">
            {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded-lg object-cover" />}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{item.name}</p>
              {item.variantName && <p className="text-xs text-gray-500">{item.variantName}</p>}
              <p className="text-sm text-gray-600">{formatMoney(item.unitPrice, symbol, position)}</p>
            </div>
            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => updateQuantity(item.productId, item.variantId, Number(e.target.value))}
              className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm"
            />
            <button
              onClick={() => removeItem(item.productId, item.variantId)}
              className="text-sm text-red-600 hover:underline"
            >
              {t('common.delete')}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-lg font-semibold text-gray-900">
        <span>{t('storefront.subtotal')}</span>
        <span>{formatMoney(subtotal, symbol, position)}</span>
      </div>

      <Link to={`/store/${slug}/checkout`}>
        <Button className="mt-6 w-full">{t('storefront.checkout')}</Button>
      </Link>
    </div>
  )
}
