import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { QueryErrorState } from '@/components/ui/QueryErrorState'
import { exportBuyersCsv, listBuyers, resendDelivery, type Buyer } from '@/services/digital.service'
import { updateOrderStatus } from '@/services/orders.service'
import { extractErrorMessage } from '@/services/api-client'
import { useAuthStore } from '@/store/auth.store'
import { useIsOwner } from '@/hooks/useIsOwner'
import { CHANNEL_LABELS } from '@/utils/plans'
import { formatDateTime, formatMoney } from '@/utils/format'
import type { PaymentStatus } from '@/types/api'

const PAGE_SIZE = 50
const PAYMENT_STATUSES: PaymentStatus[] = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'DISPUTED']

const paymentColors: Record<PaymentStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  FAILED: 'bg-gray-100 text-gray-500',
  REFUNDED: 'bg-red-100 text-red-700',
  DISPUTED: 'bg-orange-100 text-orange-700',
}

/** Everything about one sale in one place: who paid, whether the files reached them, and what to do if not. */
export function BuyersPage() {
  const { t } = useTranslation()
  const isOwner = useIsOwner()
  const queryClient = useQueryClient()
  const activeTenant = useAuthStore((s) => s.activeTenant)
  const symbol = activeTenant?.currencySymbol ?? '$'
  const position = (activeTenant?.currencySymbolPosition as 'pre' | 'post') ?? 'pre'

  const [search, setSearch] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const filters = {
    search: search || undefined,
    paymentStatus: paymentStatus || undefined,
    // A bare date means the start of that day for "from" and the end of it for "to".
    dateFrom: dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : undefined,
    dateTo: dateTo ? new Date(`${dateTo}T23:59:59.999`).toISOString() : undefined,
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['buyers', filters, page],
    queryFn: () => listBuyers({ ...filters, page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  const resend = useMutation({
    mutationFn: (orderId: string) => resendDelivery(orderId),
    onSuccess: () => {
      toast.success(t('buyers.resendQueued'))
      void queryClient.invalidateQueries({ queryKey: ['buyers'] })
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })
  const refund = useMutation({
    mutationFn: (orderId: string) => updateOrderStatus(orderId, 'REFUNDED'),
    onSuccess: () => {
      toast.success(t('buyers.refunded'))
      void queryClient.invalidateQueries({ queryKey: ['buyers'] })
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  async function handleExport() {
    setExporting(true)
    try {
      await exportBuyersCsv(filters)
    } catch (error) {
      toast.error(extractErrorMessage(error, t('errors.generic')))
    } finally {
      setExporting(false)
    }
  }

  const resetPage = <T,>(set: (value: T) => void) => (value: T) => {
    set(value)
    setPage(1)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('buyers.title')}</h1>
          {data && <p className="text-sm text-gray-500">{t('buyers.total', { count: data.meta.total })}</p>}
        </div>
        {/* The export carries every buyer's personal data: OWNER-only on the API. */}
        {isOwner && (
          <Button variant="secondary" onClick={() => void handleExport()} loading={exporting}>
            {t('buyers.exportCsv')}
          </Button>
        )}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder={t('buyers.searchPlaceholder')}
          value={search}
          onChange={(e) => resetPage(setSearch)(e.target.value)}
        />
        <select
          aria-label={t('buyers.paymentStatus')}
          value={paymentStatus}
          onChange={(e) => resetPage(setPaymentStatus)(e.target.value as PaymentStatus | '')}
          className="rounded-lg border border-gray-300 px-3 py-3 text-sm sm:py-2"
        >
          <option value="">{t('buyers.allStatuses')}</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`buyers.status.${s}`)}
            </option>
          ))}
        </select>
        <Input type="date" aria-label={t('buyers.from')} value={dateFrom} onChange={(e) => resetPage(setDateFrom)(e.target.value)} />
        <Input type="date" aria-label={t('buyers.to')} value={dateTo} onChange={(e) => resetPage(setDateTo)(e.target.value)} />
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : isError ? (
        <QueryErrorState onRetry={() => void refetch()} />
      ) : data && data.items.length === 0 ? (
        <Card className="text-center text-sm text-gray-400">{t('buyers.empty')}</Card>
      ) : (
        data && (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">{t('buyers.buyer')}</th>
                    <th className="px-4 py-3">{t('buyers.product')}</th>
                    <th className="px-4 py-3">{t('buyers.amount')}</th>
                    <th className="px-4 py-3">{t('buyers.date')}</th>
                    <th className="px-4 py-3">{t('buyers.paymentStatus')}</th>
                    <th className="px-4 py-3">{t('buyers.provider')}</th>
                    <th className="px-4 py-3">{t('buyers.delivery')}</th>
                    <th className="px-4 py-3 text-right">{t('orders.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.items.map((buyer) => (
                    <BuyerRow
                      key={buyer.orderId}
                      buyer={buyer}
                      symbol={symbol}
                      position={position}
                      isOwner={isOwner}
                      busy={resend.isPending || refund.isPending}
                      onResend={() => resend.mutate(buyer.orderId)}
                      onRefund={() => {
                        if (confirm(t('orders.refundConfirm'))) refund.mutate(buyer.orderId)
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {data.meta.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  {t('common.back')}
                </Button>
                <span>{t('buyers.pageOf', { page: data.meta.page, total: data.meta.totalPages })}</span>
                <Button variant="secondary" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                  {t('common.next')}
                </Button>
              </div>
            )}
          </>
        )
      )}
    </div>
  )
}

function BuyerRow({
  buyer,
  symbol,
  position,
  isOwner,
  busy,
  onResend,
  onRefund,
}: {
  buyer: Buyer
  symbol: string
  position: 'pre' | 'post'
  isOwner: boolean
  busy: boolean
  onResend: () => void
  onRefund: () => void
}) {
  const { t } = useTranslation()
  const paid = buyer.paymentStatus === 'PAID'
  const canResend = paid && buyer.deliveryStatus !== null && buyer.deliveryStatus !== 'REVOKED'
  const deliveryLabel = buyer.deliveryStatus
    ? t(`buyers.deliveryStatus.${buyer.deliveryStatus}`)
    : paid
      ? t('buyers.deliveryStatus.NONE')
      : '—'

  return (
    <tr>
      <td className="px-4 py-3">
        <span className="block font-medium text-gray-900">{buyer.customerName}</span>
        <span className="block text-xs text-gray-500">{buyer.customerEmail}</span>
        <span className="block text-xs text-gray-400">{buyer.orderNumber}</span>
      </td>
      <td className="px-4 py-3 text-gray-700">{buyer.products.join(', ')}</td>
      <td className="whitespace-nowrap px-4 py-3 tabular-nums">{formatMoney(Number(buyer.amount), symbol, position)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDateTime(buyer.createdAt)}</td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${paymentColors[buyer.paymentStatus]}`}>
          {t(`buyers.status.${buyer.paymentStatus}`)}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-600">{CHANNEL_LABELS[buyer.provider]}</td>
      <td className="px-4 py-3">
        <span className="block text-gray-700">{deliveryLabel}</span>
        {buyer.deliveryStatus === 'PENDING' && buyer.lastError && (
          <span className="block max-w-[200px] truncate text-xs text-amber-700" title={buyer.lastError}>
            {buyer.lastError}
          </span>
        )}
        {buyer.deliveryStatus && buyer.deliveryStatus !== 'REVOKED' && (
          <span className="block text-xs text-gray-400">{t('buyers.downloads', { count: buyer.downloads })}</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right">
        {canResend && (
          <Button type="button" variant="ghost" disabled={busy} onClick={onResend}>
            {t('buyers.resend')}
          </Button>
        )}
        {isOwner && paid && (
          <Button type="button" variant="ghost" disabled={busy} onClick={onRefund}>
            {t('buyers.refund')}
          </Button>
        )}
      </td>
    </tr>
  )
}
