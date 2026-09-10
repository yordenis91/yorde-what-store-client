import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { getCustomer } from '@/services/customers-admin.service'
import { useAuthStore } from '@/store/auth.store'
import { formatDate, formatMoney } from '@/utils/format'
import type { CustomerSegment } from '@/types/api'

const segmentColors: Record<CustomerSegment, string> = {
  new: 'bg-gray-100 text-gray-600',
  recurring: 'bg-blue-100 text-blue-700',
  vip: 'bg-amber-100 text-amber-700',
}

export function CustomerDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const activeTenant = useAuthStore((s) => s.activeTenant)
  const symbol = activeTenant?.currencySymbol ?? '$'
  const position = (activeTenant?.currencySymbolPosition as 'pre' | 'post') ?? 'pre'

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id!),
  })

  if (isLoading || !customer) return <p className="text-sm text-gray-500">{t('common.loading')}</p>

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => navigate('/admin/customers')} className="text-sm text-brand-700">
          ← {t('common.back')}
        </button>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">{customer.name}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs ${segmentColors[customer.segment]}`}>
          {t(`customers.segments.${customer.segment}`)}
        </span>
      </div>

      <Card className="mb-4">
        <h2 className="mb-2 font-medium text-gray-900">{t('customers.contact')}</h2>
        {customer.email && <p className="text-sm text-gray-700">{customer.email}</p>}
        {customer.phone && <p className="text-sm text-gray-500">{customer.phone}</p>}
        <p className="mt-1 text-sm text-gray-500">
          {t('customers.customerSince')} {formatDate(customer.createdAt)}
        </p>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-2 font-medium text-gray-900">{t('customers.stats')}</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">{t('customers.totalOrders')}</p>
            <p className="font-semibold text-gray-900">{customer.totalOrders}</p>
          </div>
          <div>
            <p className="text-gray-500">{t('customers.totalSpent')}</p>
            <p className="font-semibold text-gray-900">{formatMoney(customer.totalSpent, symbol, position)}</p>
          </div>
          <div>
            <p className="text-gray-500">{t('customers.lastOrderAt')}</p>
            <p className="font-semibold text-gray-900">
              {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : '—'}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-medium text-gray-900">{t('customers.orderHistory')}</h2>
        {customer.orders.length === 0 ? (
          <p className="text-sm text-gray-500">{t('account.noOrders')}</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {customer.orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{order.orderNumber}</p>
                  <p className="text-gray-500">{formatDate(order.createdAt)}</p>
                </div>
                <span className="font-medium">{formatMoney(order.grandTotal, symbol, position)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
