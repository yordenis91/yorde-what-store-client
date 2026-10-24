import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useStorefront } from '@/hooks/useStorefront'
import { formatMoney } from '@/utils/format'
import { extractErrorMessage } from '@/services/api-client'
import { getPublicOrder, uploadPaymentProofImage } from '@/services/orders.service'
import { capturePayPalOrder } from '@/services/payments.service'
import type { Order, PaymentStatus, PublicOrder } from '@/types/api'

export function StorefrontOrderConfirmedPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { tenant, slug, path } = useStorefront()
  const location = useLocation()
  const initialOrder = (location.state as { order?: Order } | null)?.order
  const [order, setOrder] = useState(initialOrder)
  const [searchParams] = useSearchParams()
  // PayPal sends the buyer back with the PayPal order id as `token`. Coming back proves nothing:
  // the server captures and confirms only if PayPal says the payment completed.
  const isPayPalReturn = searchParams.has('token')
  const payPal = usePayPalSettlement(slug, id, isPayPalReturn)
  const shownOrder: Order | PublicOrder | undefined = order ?? payPal.order
  const isDigital = tenant.catalogType === 'DIGITAL'

  const symbol = tenant.currencySymbol
  const position = tenant.currencySymbolPosition as 'pre' | 'post'

  return (
    <div className="mx-auto max-w-md">
      {isPayPalReturn && payPal.state !== 'paid' ? (
        <PayPalPending state={payPal.state} onRetry={payPal.retry} checkoutPath={path('/checkout')} />
      ) : (
        <div className="mb-6 text-center print:hidden">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600">
            ✓
          </div>
          <h1 className="mb-2 text-2xl font-semibold text-gray-900">
            {isPayPalReturn ? t('storefront.paypalPaid') : t('storefront.orderConfirmed')}
          </h1>
          <p className="text-sm text-gray-500">Order ID: {shownOrder?.orderNumber ?? id}</p>
          <p className="mt-3 text-sm text-gray-700">{t('storefront.orderThanks')}</p>
          {isDigital && (
            <p role="status" className="mt-3 rounded-lg bg-brand-50 px-4 py-3 text-sm text-gray-800">
              {shownOrder?.customerEmail
                ? t('storefront.digitalDeliveryNoteTo', { email: shownOrder.customerEmail })
                : t('storefront.digitalDeliveryNote')}
            </p>
          )}
          <Link to={path(`/order/${id}`)} className="mt-4 inline-block">
            <Button>{t('storefront.viewOrderDetails')}</Button>
          </Link>
        </div>
      )}

      <InvoiceLink url={`${window.location.origin}${path(`/order/${id}`)}`} />

      {shownOrder && (
        <Card className="mb-6">
          <div className="flex flex-col divide-y divide-gray-100">
            {shownOrder.items.map((item) => (
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
              <span>{formatMoney(shownOrder.subtotal, symbol, position)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>{t('storefront.tax')}</span>
              <span>{formatMoney(shownOrder.taxTotal, symbol, position)}</span>
            </div>
            {Number(shownOrder.discountTotal) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>{t('storefront.discount')}</span>
                <span>-{formatMoney(shownOrder.discountTotal, symbol, position)}</span>
              </div>
            )}
            {Number(shownOrder.shippingTotal) > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>{t('storefront.shipping')}</span>
                <span>{formatMoney(shownOrder.shippingTotal, symbol, position)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold text-gray-900">
              <span>{t('storefront.total')}</span>
              <span>{formatMoney(shownOrder.grandTotal, symbol, position)}</span>
            </div>
          </div>
        </Card>
      )}

      {order && order.fulfillmentMethod === 'ZELLE' && (
        <ZelleProofUpload slug={slug} order={order} onUpdated={setOrder} />
      )}

      <div className="flex justify-center gap-3 print:hidden">
        {shownOrder && (
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

type PayPalState = 'confirming' | 'paid' | 'pending' | 'failed' | 'error'

/**
 * Settles a PayPal purchase on the buyer's return: asks the server to capture, then reads the order
 * back. The server confirms only when PayPal says the capture completed, so this page shows "paid"
 * only for a payment that really is. Capturing is idempotent, so a refresh or a second tab is safe.
 */
function usePayPalSettlement(slug: string, orderId: string | undefined, active: boolean) {
  const [state, setState] = useState<PayPalState>('confirming')
  const [order, setOrder] = useState<PublicOrder>()
  const started = useRef(false)

  const run = useCallback(async () => {
    if (!orderId) return
    setState('confirming')
    try {
      const result = await capturePayPalOrder(slug, orderId)
      setOrder(await getPublicOrder(slug, orderId))
      const paymentStatus: PaymentStatus = result.paymentStatus
      setState(paymentStatus === 'PAID' ? 'paid' : paymentStatus === 'FAILED' ? 'failed' : 'pending')
    } catch {
      setState('error')
    }
  }, [slug, orderId])

  useEffect(() => {
    // Once per visit: React StrictMode runs effects twice in development.
    if (!active || started.current) return
    started.current = true
    void run()
  }, [active, run])

  return { state, order, retry: run }
}

function PayPalPending({
  state,
  onRetry,
  checkoutPath,
}: {
  state: Exclude<PayPalState, 'paid'>
  onRetry: () => void
  checkoutPath: string
}) {
  const { t } = useTranslation()
  if (state === 'confirming') {
    return (
      <div role="status" className="mb-6 text-center print:hidden">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-600" />
        <h1 className="mb-2 text-xl font-semibold text-gray-900">{t('storefront.paypalConfirming')}</h1>
        <p className="text-sm text-gray-500">{t('storefront.paypalConfirmingHint')}</p>
      </div>
    )
  }
  if (state === 'failed') {
    return (
      <div role="alert" className="mb-6 text-center print:hidden">
        <h1 className="mb-2 text-xl font-semibold text-gray-900">{t('storefront.paypalFailed')}</h1>
        <p className="text-sm text-gray-600">{t('storefront.paypalFailedHint')}</p>
        <Link to={checkoutPath} className="mt-4 inline-block">
          <Button>{t('storefront.paypalTryAgain')}</Button>
        </Link>
      </div>
    )
  }
  return (
    <div role="status" className="mb-6 text-center print:hidden">
      <h1 className="mb-2 text-xl font-semibold text-gray-900">
        {state === 'error' ? t('storefront.paypalError') : t('storefront.paypalPending')}
      </h1>
      <p className="text-sm text-gray-600">
        {state === 'error' ? t('storefront.paypalErrorHint') : t('storefront.paypalPendingHint')}
      </p>
      <Button type="button" variant="secondary" onClick={onRetry} className="mt-4">
        {t('storefront.paypalCheckAgain')}
      </Button>
    </div>
  )
}

/**
 * Deliberately separate from order creation (see CreateOrderPayload's optional
 * paymentProofUrl/paymentReference, unused by this checkout): the customer may
 * not have the confirmation screenshot on hand yet, or may come back to this
 * page later, so this step must never be able to block placing the order.
 */
function ZelleProofUpload({
  slug,
  order,
  onUpdated,
}: {
  slug: string
  order: Order
  onUpdated: (order: Order) => void
}) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [reference, setReference] = useState('')
  const [uploading, setUploading] = useState(false)

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const updated = await uploadPaymentProofImage(slug, order.id, file, reference || undefined)
      onUpdated(updated)
      toast.success(t('storefront.zelleProofUploaded'))
    } catch (error) {
      toast.error(extractErrorMessage(error, t('errors.generic')))
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  if (order.paymentStatus === 'PAID') {
    return (
      <Card className="mb-6 print:hidden">
        <p className="text-sm font-medium text-emerald-700">{t('storefront.zelleAlreadyPaid')}</p>
      </Card>
    )
  }

  return (
    <Card className="mb-6 print:hidden">
      <h2 className="font-semibold text-gray-900">{t('storefront.zelleUploadProof')}</h2>
      <p className="mt-1 text-xs text-gray-500">{t('storefront.zelleUploadProofHint')}</p>

      {order.paymentProofUrl && (
        <p className="mt-3 text-sm font-medium text-amber-700">{t('storefront.zelleProofPending')}</p>
      )}

      <div className="mt-3 flex flex-col gap-3">
        <Input
          label={t('storefront.zelleReference')}
          name="zelleReference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleFile(e)} />
        <Button type="button" variant="secondary" loading={uploading} onClick={() => inputRef.current?.click()} className="w-fit">
          {order.paymentProofUrl ? t('storefront.zelleReplaceProof') : t('storefront.zelleUploadButton')}
        </Button>
      </div>
    </Card>
  )
}

/** The link to the customer's invoice page, to keep: the confirmation page itself is not reachable again. */
function InvoiceLink({ url }: { url: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('errors.generic'))
    }
  }

  return (
    <Card className="mb-6 print:hidden">
      <label htmlFor="invoice-link" className="text-sm font-medium text-gray-700">
        {t('storefront.orderInvoiceLink')}
      </label>
      <p className="mt-0.5 text-xs text-gray-500">{t('storefront.orderInvoiceLinkHint')}</p>
      <div className="mt-2 flex gap-2">
        <input
          id="invoice-link"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700"
        />
        <Button type="button" variant="secondary" onClick={() => void copy()} className="shrink-0">
          {copied ? t('storefront.linkCopied') : t('storefront.copyLink')}
        </Button>
      </div>
      <span role="status" className="sr-only">
        {copied ? t('storefront.linkCopied') : ''}
      </span>
    </Card>
  )
}
