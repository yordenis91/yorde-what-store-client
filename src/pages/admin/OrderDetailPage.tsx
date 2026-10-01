import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { confirmZellePayment, downloadInvoice, getOrder, rejectZellePayment, updateOrderStatus } from '@/services/orders.service'
import { useAuthStore } from '@/store/auth.store'
import { formatDate, formatMoney } from '@/utils/format'
import { extractErrorMessage, resolveMediaUrl } from '@/services/api-client'
import type { OrderStatus } from '@/types/api'

const STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED']

/** Mirrors the backend's terminal-status guard (OrdersService.updateStatus) so the UI doesn't offer a change the API will reject with a 409. */
const TERMINAL_STATUSES: OrderStatus[] = ['CANCELLED', 'REFUNDED']

export function OrderDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const activeTenant = useAuthStore((s) => s.activeTenant)
  const symbol = activeTenant?.currencySymbol ?? '$'
  const position = (activeTenant?.currencySymbolPosition as 'pre' | 'post') ?? 'pre'

  const { data: order, isLoading } = useQuery({ queryKey: ['order', id], queryFn: () => getOrder(id!) })

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => updateOrderStatus(id!, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['order', id] })
      toast.success(t('orders.status'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  const invoiceMutation = useMutation({
    mutationFn: () => downloadInvoice(id!, order!.orderNumber),
    onError: (error) => toast.error(extractErrorMessage(error, t('orders.invoiceNotReady'))),
  })

  const confirmZelleMutation = useMutation({
    mutationFn: () => confirmZellePayment(id!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['order', id] })
      toast.success(t('orders.zellePaymentConfirmed'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  const rejectZelleMutation = useMutation({
    mutationFn: () => rejectZellePayment(id!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['order', id] })
      toast.success(t('orders.zelleProofRejected'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  if (isLoading || !order) return <p className="text-sm text-gray-500">{t('common.loading')}</p>

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <button onClick={() => navigate('/admin/orders')} className="text-sm text-brand-700">
          ← {t('common.back')}
        </button>
        <div className="flex gap-2">
          {order.invoiceAvailable && (
            <Button variant="secondary" onClick={() => invoiceMutation.mutate()} loading={invoiceMutation.isPending}>
              {t('orders.downloadInvoice')}
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => navigate(`/admin/orders/${order.id}/edit`)}
            disabled={TERMINAL_STATUSES.includes(order.status)}
            title={TERMINAL_STATUSES.includes(order.status) ? t('orders.editLocked', { status: order.status }) : undefined}
          >
            {t('common.edit')}
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            Print receipt
          </Button>
        </div>
      </div>
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">{order.orderNumber}</h1>
      <p className="mb-6 text-sm text-gray-500">{formatDate(order.createdAt)}</p>

      <Card className="mb-4">
        <h2 className="mb-2 font-medium text-gray-900">{t('orders.customer')}</h2>
        <p className="text-sm text-gray-700">{order.customerName}</p>
        {order.customerEmail && <p className="text-sm text-gray-500">{order.customerEmail}</p>}
        {order.customerPhone && (
          <p className="text-sm text-gray-500">
            {order.customerPhone}{' '}
            <a
              href={`https://wa.me/${order.customerPhone.replace(/[^\d]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-green-600 hover:underline print:hidden"
            >
              WhatsApp
            </a>
          </p>
        )}
      </Card>

      <Card className="mb-4">
        <h2 className="mb-2 font-medium text-gray-900">{t('products.title')}</h2>
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
            <div className="flex justify-between text-gray-500">
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
          <div className="flex justify-between font-semibold text-gray-900">
            <span>{t('storefront.total')}</span>
            <span>{formatMoney(order.grandTotal, symbol, position)}</span>
          </div>
        </div>
      </Card>

      {(order.shipping || order.shippingAddress) && (
        <Card className="mb-4">
          <h2 className="mb-2 font-medium text-gray-900">{t('orders.delivery')}</h2>
          {order.shipping && (
            <p className="text-sm text-gray-700">
              {t('orders.deliveryMethod')}: <span className="font-medium">{order.shipping.name}</span>
            </p>
          )}
          {order.shippingAddress && (
            <div className="mt-1 text-sm text-gray-700">
              {order.shippingAddress.line1 && <p>{order.shippingAddress.line1}</p>}
              {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
              {(order.shippingAddress.city || order.shippingAddress.state || order.shippingAddress.postalCode) && (
                <p>
                  {[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postalCode]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              {order.shippingAddress.notes && (
                <p className="mt-1 text-xs text-gray-500">{order.shippingAddress.notes}</p>
              )}
            </div>
          )}
        </Card>
      )}

      {order.fulfillmentMessage && (
        <Card className="mb-4">
          <h2 className="mb-2 font-medium text-gray-900">{t('orders.messageSent')}</h2>
          <pre className="whitespace-pre-wrap text-sm text-gray-700">{order.fulfillmentMessage}</pre>
        </Card>
      )}

      {order.fulfillmentMethod === 'ZELLE' && (
        <Card className="mb-4">
          <h2 className="mb-2 font-medium text-gray-900">{t('orders.zellePayment')}</h2>

          {!order.paymentProofUrl && <p className="text-sm text-gray-500">{t('orders.zelleNoProof')}</p>}

          {order.paymentProofUrl && (
            <div className="flex flex-col gap-3">
              <a href={resolveMediaUrl(order.paymentProofUrl)} target="_blank" rel="noreferrer">
                <img
                  src={resolveMediaUrl(order.paymentProofUrl)}
                  alt={t('orders.zellePayment')}
                  className="max-h-64 w-fit rounded-lg border border-gray-200"
                />
              </a>
              {order.paymentReference && (
                <p className="text-sm text-gray-700">
                  {t('orders.zelleReference')}: <span className="font-medium">{order.paymentReference}</span>
                </p>
              )}

              {order.paymentStatus === 'PAID' ? (
                <p className="text-sm font-medium text-emerald-700">{t('orders.zellePaymentConfirmed')}</p>
              ) : (
                <div className="flex gap-2 print:hidden">
                  <Button
                    onClick={() => confirmZelleMutation.mutate()}
                    loading={confirmZelleMutation.isPending}
                    disabled={rejectZelleMutation.isPending}
                  >
                    {t('orders.zelleConfirmPayment')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => rejectZelleMutation.mutate()}
                    loading={rejectZelleMutation.isPending}
                    disabled={confirmZelleMutation.isPending}
                  >
                    {t('orders.zelleRejectProof')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      <Card className="print:hidden">
        <h2 className="mb-2 font-medium text-gray-900">{t('orders.status')}</h2>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => {
            const isCurrent = status === order.status
            const locked = TERMINAL_STATUSES.includes(order.status) && !isCurrent
            return (
              <Button
                key={status}
                variant={isCurrent ? 'primary' : 'secondary'}
                onClick={() => statusMutation.mutate(status)}
                disabled={statusMutation.isPending || locked}
                title={locked ? t('orders.statusLocked', { status: order.status }) : undefined}
              >
                {status}
              </Button>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
