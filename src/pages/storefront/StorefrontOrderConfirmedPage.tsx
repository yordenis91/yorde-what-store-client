import { Link, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useStorefront } from '@/hooks/useStorefront'
import { formatMoney } from '@/utils/format'
import type { Order } from '@/types/api'

export function StorefrontOrderConfirmedPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { tenant, path } = useStorefront()
  const location = useLocation()
  const order = (location.state as { order?: Order } | null)?.order

  const symbol = tenant.currencySymbol
  const position = tenant.currencySymbolPosition as 'pre' | 'post'

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 text-center print:hidden">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600">
          ✓
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-gray-900">{t('storefront.orderConfirmed')}</h1>
        <p className="text-sm text-gray-500">Order ID: {order?.orderNumber ?? id}</p>
      </div>

      {order && (
        <Card className="mb-6">
          <div className="flex flex-col divide-y divide-gray-100">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {item.quantity} × {item.productName}
                  {item.variantName ? ` (${item.variantName})` : ''}
                </span>
                <span className="font-medium">{formatMoney(item.lineTotal, symbol, position)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-1 border-t border-gray-100 pt-3 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>{t('storefront.subtotal')}</span>
              <span>{formatMoney(order.subtotal, symbol, position)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>{t('storefront.tax')}</span>
              <span>{formatMoney(order.taxTotal, symbol, position)}</span>
            </div>
            {Number(order.discountTotal) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>{t('storefront.discount')}</span>
                <span>-{formatMoney(order.discountTotal, symbol, position)}</span>
              </div>
            )}
            {Number(order.shippingTotal) > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>{t('storefront.shipping')}</span>
                <span>{formatMoney(order.shippingTotal, symbol, position)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold text-gray-900">
              <span>{t('storefront.total')}</span>
              <span>{formatMoney(order.grandTotal, symbol, position)}</span>
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-center gap-3 print:hidden">
        {order && (
          <Button variant="secondary" onClick={() => window.print()}>
            Print receipt
          </Button>
        )}
        <Link to={path()}>
          <Button variant="secondary">{t('storefront.continueShopping')}</Button>
        </Link>
      </div>
    </div>
  )
}
