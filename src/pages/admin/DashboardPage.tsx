import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '@/components/ui/Card'
import { DASHBOARD_RANGES, getDashboardSummary, type DashboardRange } from '@/services/dashboard.service'
import { useAuthStore } from '@/store/auth.store'
import { storefrontUrl } from '@/config/storefront'
import { formatDate, formatMoney } from '@/utils/format'

function RevenueChart({ data }: { data: { date: string; orders: number; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ left: -20, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} fontSize={11} stroke="#9ca3af" />
        <YAxis fontSize={11} stroke="#9ca3af" allowDecimals={false} />
        <Tooltip
          formatter={(value, name) => [name === 'revenue' ? Number(value).toFixed(2) : value, name]}
        />
        <Bar dataKey="orders" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
        <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function VisitsChart({ data }: { data: { date: string; visitors: number; pageviews: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ left: -20, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} fontSize={11} stroke="#9ca3af" />
        <YAxis fontSize={11} stroke="#9ca3af" allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="pageviews" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
        <Line type="monotone" dataKey="visitors" stroke="#059669" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const activeTenant = useAuthStore((s) => s.activeTenant)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)
  const [range, setRange] = useState<DashboardRange>('7d')

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary', range],
    queryFn: () => getDashboardSummary(range),
  })

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
      toast.success(t('dashboard.linkCopied'))
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const symbol = activeTenant?.currencySymbol ?? '$'
  const position = (activeTenant?.currencySymbolPosition as 'pre' | 'post') ?? 'pre'

  const periodStats = [
    { label: t('dashboard.periodRevenue'), value: formatMoney(summary?.periodRevenue ?? 0, symbol, position) },
    { label: t('dashboard.periodOrders'), value: summary?.periodOrders ?? '—' },
    { label: t('dashboard.averageOrderValue'), value: formatMoney(summary?.averageOrderValue ?? 0, symbol, position) },
    { label: t('dashboard.uniqueVisitors'), value: summary?.uniqueVisitors ?? '—' },
    {
      label: t('dashboard.conversionRate'),
      value: summary?.conversionRate == null ? '—' : `${(summary.conversionRate * 100).toFixed(1)}%`,
    },
  ]

  const lifetimeStats = [
    { label: t('dashboard.totalProducts'), value: summary?.totalProducts ?? '—' },
    { label: t('dashboard.totalOrders'), value: summary?.totalOrders ?? '—' },
    { label: t('dashboard.pendingOrders'), value: summary?.pendingOrders ?? '—' },
    { label: t('dashboard.lifetimeRevenue'), value: formatMoney(summary?.lifetimeRevenue ?? 0, symbol, position) },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">{t('dashboard.title')}</h1>
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {DASHBOARD_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                range === r ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t(`dashboard.range${r}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {periodStats.map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {lifetimeStats.map((stat) => (
          <Card key={stat.label} className="p-3">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className="mt-1 text-lg font-semibold text-gray-700">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-medium text-gray-900">{t('dashboard.revenueOverTime')}</h2>
          {isLoading ? (
            <p className="text-sm text-gray-500">{t('common.loading')}</p>
          ) : (
            <RevenueChart data={summary?.revenueOverTime ?? []} />
          )}
        </Card>

        <Card className="flex flex-col items-center justify-center gap-2 text-center">
          <h2 className="font-medium text-gray-900">{t('dashboard.storeLink')}</h2>
          <canvas ref={canvasRef} className="rounded" />
          <button onClick={copyLink} className="text-xs font-medium text-brand-700 hover:underline">
            {copied ? t('dashboard.copied') : t('dashboard.copyLink')}
          </button>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-medium text-gray-900">{t('dashboard.topProducts')}</h2>
          <div className="flex flex-col divide-y divide-gray-100">
            {summary?.topProducts.map((p) => (
              <div key={p.productId ?? p.name} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-700">{p.name}</span>
                <span className="text-gray-500">
                  {p.quantitySold} sold · {formatMoney(p.revenue, symbol, position)}
                </span>
              </div>
            ))}
            {summary?.topProducts.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">{t('dashboard.noTopProducts')}</p>
            )}
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

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-medium text-gray-900">{t('dashboard.visitsOverTime')}</h2>
          {isLoading ? (
            <p className="text-sm text-gray-500">{t('common.loading')}</p>
          ) : (
            <VisitsChart data={summary?.visitsOverTime ?? []} />
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-medium text-gray-900">{t('dashboard.topReferrers')}</h2>
          <div className="flex flex-col divide-y divide-gray-100">
            {summary?.topReferrers.map((r) => (
              <div key={r.referrer} className="flex items-center justify-between py-2 text-sm">
                <span className="truncate text-gray-700">{r.referrer}</span>
                <span className="text-gray-500">{r.sessions}</span>
              </div>
            ))}
            {summary?.topReferrers.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">{t('dashboard.noReferrers')}</p>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <h2 className="mb-3 font-medium text-gray-900">{t('dashboard.couponPerformance')}</h2>
          <div className="flex flex-col divide-y divide-gray-100">
            {summary?.couponPerformance.map((c) => (
              <div key={c.code} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium text-gray-700">{c.code}</span>
                <span className="text-gray-500">
                  {c.timesUsed} {t('dashboard.timesUsed').toLowerCase()} ·{' '}
                  {formatMoney(c.discountGiven, symbol, position)} {t('dashboard.discountGiven').toLowerCase()}
                </span>
              </div>
            ))}
            {summary?.couponPerformance.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">{t('dashboard.noCouponUsage')}</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
