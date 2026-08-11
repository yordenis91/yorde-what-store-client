import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/Input'
import { listOrders } from '@/services/orders.service'
import { useAuthStore } from '@/store/auth.store'
import { formatDate, formatMoney } from '@/utils/format'

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  REFUNDED: 'bg-red-100 text-red-700',
}

export function OrdersListPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const activeTenant = useAuthStore((s) => s.activeTenant)
  const symbol = activeTenant?.currencySymbol ?? '$'
  const position = (activeTenant?.currencySymbolPosition as 'pre' | 'post') ?? 'pre'

  const { data, isLoading } = useQuery({
    queryKey: ['orders', search],
    queryFn: () => listOrders({ page: 1, limit: 50, search: search || undefined }),
  })

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('orders.title')}</h1>
      <Input placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 max-w-xs" />

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{t('orders.orderNumber')}</th>
                <th className="px-4 py-3">{t('orders.customer')}</th>
                <th className="px-4 py-3">{t('orders.fulfillment')}</th>
                <th className="px-4 py-3">{t('orders.status')}</th>
                <th className="px-4 py-3">{t('orders.total')}</th>
                <th className="px-4 py-3">{t('orders.date')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data?.items.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{order.orderNumber}</td>
                  <td className="px-4 py-3">{order.customerName}</td>
                  <td className="px-4 py-3">{order.fulfillmentMethod}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusColors[order.status]}`}>{order.status}</span>
                  </td>
                  <td className="px-4 py-3">{formatMoney(order.grandTotal, symbol, position)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/orders/${order.id}`} className="font-medium text-brand-700">
                      {t('orders.viewDetail')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
