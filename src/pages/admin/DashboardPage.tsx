import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { getDashboardSummary } from '@/services/dashboard.service'
import { useAuthStore } from '@/store/auth.store'
import { storefrontUrl } from '@/config/storefront'
import { formatDate, formatMoney } from '@/utils/format'

function OrdersChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div className="flex h-32 items-end gap-2">
      {data.map((d) => (
        <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-brand-500"
            style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
            title={`${d.count} orders`}
          />
          <span className="text-[10px] text-gray-400">{d.date.slice(5)}</span>
        </div>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const activeTenant = useAuthStore((s) => s.activeTenant)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)

  const { data: summary, isLoading } = useQuery({ queryKey: ['dashboard-summary'], queryFn: getDashboardSummary })

  // Resolves to the store's own subdomain when one is configured, so the QR code
  // and the shared link point at the customer-facing address, not the admin host.
  const storefrontLink = activeTenant ? storefrontUrl(activeTenant.slug) : ''

  useEffect(() => {
    if (canvasRef.current && storefrontLink) {
      void QRCode.toCanvas(canvasRef.current, storefrontLink, { width: 120, margin: 1 })
    }
  }, [storefrontLink])

  function copyLink() {
    void navigator.clipboard.writeText(storefrontLink).then(() => {
      setCopied(true)
      toast.success('Link copied')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const symbol = activeTenant?.currencySymbol ?? '$'
  const position = (activeTenant?.currencySymbolPosition as 'pre' | 'post') ?? 'pre'

  const stats = [
    { label: t('dashboard.totalProducts'), value: summary?.totalProducts ?? '—' },
    { label: t('dashboard.totalOrders'), value: summary?.totalOrders ?? '—' },
    { label: t('dashboard.pendingOrders'), value: summary?.pendingOrders ?? '—' },
    { label: t('dashboard.revenue'), value: formatMoney(summary?.revenue ?? 0, symbol, position) },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('dashboard.title')}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-medium text-gray-900">Orders — last 7 days</h2>
          {isLoading ? <p className="text-sm text-gray-500">{t('common.loading')}</p> : <OrdersChart data={summary?.ordersLast7Days ?? []} />}
        </Card>

        <Card className="flex flex-col items-center justify-center gap-2 text-center">
          <h2 className="font-medium text-gray-900">Your store link</h2>
          <canvas ref={canvasRef} className="rounded" />
          <button onClick={copyLink} className="text-xs font-medium text-brand-700 hover:underline">
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-medium text-gray-900">Top products</h2>
          <div className="flex flex-col divide-y divide-gray-100">
            {summary?.topProducts.map((p) => (
              <div key={p.productId} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-700">{p.name}</span>
                <span className="text-gray-500">{p.quantitySold} sold</span>
              </div>
            ))}
            {summary?.topProducts.length === 0 && <p className="py-4 text-center text-sm text-gray-400">No sales yet.</p>}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-medium text-gray-900">{t('orders.title')}</h2>
          <div className="flex flex-col divide-y divide-gray-100">
            {summary?.recentOrders.map((o) => (
              <Link
                key={o.id}
                to={`/admin/orders/${o.id}`}
                className="flex items-center justify-between py-2 text-sm hover:text-brand-700"
              >
                <span>
                  {o.orderNumber} — {o.customerName}
                </span>
                <span className="text-gray-500">
                  {formatMoney(o.grandTotal, symbol, position)} · {formatDate(o.createdAt)}
                </span>
              </Link>
            ))}
            {summary?.recentOrders.length === 0 && <p className="py-4 text-center text-sm text-gray-400">No orders yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}
