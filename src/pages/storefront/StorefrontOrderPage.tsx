import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Seo } from '@/components/storefront/Seo'
import { useStorefront } from '@/hooks/useStorefront'
import { getPublicOrder } from '@/services/orders.service'
import { formatDate, formatMoney } from '@/utils/format'

/**
 * The customer's invoice-style view of their order, for every payment method. It is
 * reached by a link that carries the (random) order id, so it is deliberately not
 * indexed and shows only what an invoice shows.
 */
export function StorefrontOrderPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { tenant, slug, path } = useStorefront()
  const symbol = tenant.currencySymbol
  const position = tenant.currencySymbolPosition as 'pre' | 'post'

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['public-order', slug, id],
    queryFn: () => getPublicOrder(slug, id!),
    enabled: !!id,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <Seo title={`${t('storefront.orderInvoice')} — ${tenant.name}`} noIndex />
        <h1 className="text-xl font-semibold text-gray-900">{t('storefront.orderNotFound')}</h1>
        <p className="mt-2 text-sm text-gray-500">{t('storefront.orderNotFoundHint')}</p>
        <Link to={path()} className="mt-6 inline-block">
          <Button variant="secondary">{t('storefront.continueShopping')}</Button>
        </Link>
      </div>
    )
  }

  const address = order.shippingAddress
  const addressCityLine = [address?.city, address?.state, address?.postalCode].filter(Boolean).join(', ')
  const paid = order.paymentStatus === 'PAID'

  return (
    <div className="mx-auto max-w-3xl">
      <Seo title={`${t('storefront.orderInvoice')} ${order.orderNumber} — ${tenant.name}`} noIndex />

      <Card className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('storefront.orderInvoice')}</h1>
            <p className="text-sm text-gray-500">
              {t('storefront.orderNumber')} #{order.orderNumber}
            </p>
          </div>
          <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
            {t('storefront.printInvoice')}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm">
          <span className="flex items-center gap-3 text-gray-600">
            <span className={`font-semibold ${paid ? 'text-emerald-700' : 'text-amber-700'}`}>
              {t(`storefront.orderStatus.${order.status}`)}
            </span>
            <span>
              {t('storefront.orderDate')}: {formatDate(order.createdAt)}
            </span>
          </span>
          <span className="text-gray-600">
            {t('storefront.payment')}: {t(`storefront.paymentStatus.${order.paymentStatus}`)}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <section>
            <h2 className="mb-2 font-semibold text-gray-900">{t('storefront.customerInformation')}</h2>
            <p className="text-sm text-gray-700">{order.customerName}</p>
            {order.customerEmail && <p className="text-sm text-gray-500">{order.customerEmail}</p>}
            {order.customerPhone && <p className="text-sm text-gray-500">{order.customerPhone}</p>}
          </section>
          <section>
            <h2 className="mb-2 font-semibold text-gray-900">{t('storefront.stepDelivery')}</h2>
            {address ? (
              <div className="text-sm text-gray-700">
                {order.shipping && <p className="font-medium">{order.shipping.name}</p>}
                {address.line1 && <p>{address.line1}</p>}
                {address.line2 && <p>{address.line2}</p>}
                {addressCityLine && <p>{addressCityLine}</p>}
                {address.notes && <p className="mt-1 text-xs text-gray-500">{address.notes}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-700">{t('storefront.pickup')}</p>
            )}
          </section>
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 font-semibold text-gray-900">{t('storefront.orderItems')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-3 font-medium">{t('storefront.item')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('storefront.qty')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('storefront.price')}</th>
                <th className="py-2 pl-3 text-right font-medium">{t('storefront.total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-3 text-gray-900">
                    {item.productName}
                    {item.variantName ? <span className="text-gray-500"> ({item.variantName})</span> : null}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-gray-700">{item.quantity}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                    {formatMoney(item.unitPrice, symbol, position)}
                  </td>
                  <td className="py-3 pl-3 text-right font-medium tabular-nums text-gray-900">
                    {formatMoney(item.lineTotal, symbol, position)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-gray-900">{t('storefront.orderSummary')}</h2>
        <div className="flex flex-col gap-1.5 text-sm text-gray-600">
          <Row label={t('storefront.subtotal')} value={formatMoney(order.subtotal, symbol, position)} />
          <Row label={t('storefront.tax')} value={formatMoney(order.taxTotal, symbol, position)} />
          {Number(order.discountTotal) > 0 && (
            <Row label={t('storefront.discount')} value={`−${formatMoney(order.discountTotal, symbol, position)}`} />
          )}
          {Number(order.shippingTotal) > 0 && (
            <Row label={t('storefront.shipping')} value={formatMoney(order.shippingTotal, symbol, position)} />
          )}
          <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3 text-lg font-semibold text-gray-900">
            <span>{t('storefront.total')}</span>
            <span className="tabular-nums text-brand-700">{formatMoney(order.grandTotal, symbol, position)}</span>
          </div>
        </div>
      </Card>

      <p className="mt-6 text-center text-sm text-gray-500">{t('storefront.thankYouBusiness')}</p>
      <div className="mt-4 flex justify-center print:hidden">
        <Link to={path()}>
          <Button variant="secondary">{t('storefront.continueShopping')}</Button>
        </Link>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
