import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getOrder, updateOrderStatus } from '@/services/orders.service'
import { useAuthStore } from '@/store/auth.store'
import { formatDate, formatMoney } from '@/utils/format'
import { extractErrorMessage } from '@/services/api-client'
import type { OrderStatus } from '@/types/api'

const STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED']

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

  if (isLoading || !order) return <p className="text-sm text-gray-500">{t('common.loading')}</p>

  return (
    <div className="max-w-2xl">
      <button onClick={() => navigate('/admin/orders')} className="mb-4 text-sm text-brand-700">
        ← {t('common.back')}
      </button>
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">{order.orderNumber}</h1>
      <p className="mb-6 text-sm text-gray-500">{formatDate(order.createdAt)}</p>

      <Card className="mb-4">
        <h2 className="mb-2 font-medium text-gray-900">{t('orders.customer')}</h2>
        <p className="text-sm text-gray-700">{order.customerName}</p>
        {order.customerEmail && <p className="text-sm text-gray-500">{order.customerEmail}</p>}
        {order.customerPhone && <p className="text-sm text-gray-500">{order.customerPhone}</p>}
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
          <div className="flex justify-between font-semibold text-gray-900">
            <span>{t('storefront.total')}</span>
            <span>{formatMoney(order.grandTotal, symbol, position)}</span>
          </div>
        </div>
      </Card>

      {order.fulfillmentMessage && (
        <Card className="mb-4">
          <h2 className="mb-2 font-medium text-gray-900">{t('orders.fulfillment')}</h2>
          <pre className="whitespace-pre-wrap text-sm text-gray-700">{order.fulfillmentMessage}</pre>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 font-medium text-gray-900">{t('orders.status')}</h2>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => (
            <Button
              key={status}
              variant={status === order.status ? 'primary' : 'secondary'}
              onClick={() => statusMutation.mutate(status)}
              disabled={statusMutation.isPending}
            >
              {status}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  )
}
