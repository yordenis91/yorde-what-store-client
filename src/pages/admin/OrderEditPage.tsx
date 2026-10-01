import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ArrowLeftIcon, TrashIcon } from '@/components/ui/icons'
import { CheckoutSteps } from '@/components/storefront/CheckoutSteps'
import { getOrder, updateOrderDetails, updateOrderStatus, type OrderDetailsInput } from '@/services/orders.service'
import { listProducts } from '@/services/products.service'
import { listShippings } from '@/services/shipping.service'
import { extractErrorMessage } from '@/services/api-client'
import { useAuthStore } from '@/store/auth.store'
import { formatMoney } from '@/utils/format'
import type { Order, OrderStatus } from '@/types/api'

const STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED']
const TERMINAL: OrderStatus[] = ['CANCELLED', 'REFUNDED']
const GATEWAY_METHODS = ['STRIPE', 'MERCADOPAGO']
const selectClass = 'w-full rounded-lg border border-gray-300 px-3 py-3 text-sm disabled:bg-gray-50 disabled:text-gray-500 sm:py-2'

interface Line {
  productId: string | null
  variantId: string | null
  name: string
  variantName: string | null
  unitPrice: number
  quantity: number
  isNew: boolean
}

interface FormValues {
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingId: string
  line1: string
  line2: string
  city: string
  state: string
  postalCode: string
  notes: string
  paymentStatus: 'PENDING' | 'PAID'
  status: OrderStatus
}

const lineKey = (l: Pick<Line, 'productId' | 'variantId'>) => `${l.productId}|${l.variantId ?? ''}`

function toLines(order: Order): Line[] {
  return order.items.map((i) => ({
    productId: i.productId,
    variantId: i.variantId,
    name: i.productName,
    variantName: i.variantName,
    unitPrice: Number(i.unitPrice),
    quantity: i.quantity,
    isNew: false,
  }))
}

export function OrderEditPage() {
  const { id } = useParams()
  const { data: order, isLoading } = useQuery({ queryKey: ['order', id], queryFn: () => getOrder(id!) })

  if (isLoading || !order) return <LoadingOrNotFound loading={isLoading} />
  // Keyed so reopening another order starts from its own data, never the previous one's.
  return <OrderEditor key={order.id} order={order} />
}

function LoadingOrNotFound({ loading }: { loading: boolean }) {
  const { t } = useTranslation()
  return <p className="text-sm text-gray-500">{loading ? t('common.loading') : t('errors.generic')}</p>
}

function OrderEditor({ order }: { order: Order }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const activeTenant = useAuthStore((s) => s.activeTenant)
  const symbol = activeTenant?.currencySymbol ?? '$'
  const position = (activeTenant?.currencySymbolPosition as 'pre' | 'post') ?? 'pre'

  const [step, setStep] = useState(0)
  const [lines, setLines] = useState<Line[]>(() => toLines(order))
  const [confirmStatus, setConfirmStatus] = useState<FormValues | null>(null)

  const isGateway = GATEWAY_METHODS.includes(order.fulfillmentMethod)
  const closed = TERMINAL.includes(order.status)
  // The charge already happened for this amount (see the API): items and shipping stay put.
  const pricingLocked = isGateway && order.paymentStatus === 'PAID'
  const itemsEditable = !pricingLocked && order.items.every((i) => i.productId)

  const address = order.shippingAddress
  const { register, handleSubmit, watch, formState } = useForm<FormValues>({
    defaultValues: {
      customerName: order.customerName,
      customerEmail: order.customerEmail ?? '',
      customerPhone: order.customerPhone ?? '',
      shippingId: order.shipping?.id ?? '',
      line1: address?.line1 ?? '',
      line2: address?.line2 ?? '',
      city: address?.city ?? '',
      state: address?.state ?? '',
      postalCode: address?.postalCode ?? '',
      notes: address?.notes ?? '',
      paymentStatus: order.paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
      status: order.status,
    },
  })
  const shippingId = watch('shippingId')

  const { data: shippings } = useQuery({ queryKey: ['shippings'], queryFn: listShippings })

  const itemsChanged = useMemo(() => {
    const before = toLines(order)
    return (
      before.length !== lines.length ||
      lines.some((l) => l.isNew || before.find((b) => lineKey(b) === lineKey(l))?.quantity !== l.quantity)
    )
  }, [order, lines])

  const saveMutation = useMutation({
    mutationFn: async (v: FormValues) => {
      const payload: OrderDetailsInput = {
        customerName: v.customerName.trim(),
        customerEmail: v.customerEmail.trim() || null,
        customerPhone: v.customerPhone.trim() || null,
      }
      if (itemsChanged && itemsEditable) {
        payload.items = lines.map((l) => ({
          productId: l.productId!,
          variantId: l.variantId ?? undefined,
          quantity: l.quantity,
        }))
      }
      if (!pricingLocked && v.shippingId !== (order.shipping?.id ?? '')) payload.shippingId = v.shippingId || null
      if (v.shippingId) {
        payload.shippingAddress = {
          line1: v.line1,
          line2: v.line2,
          city: v.city,
          state: v.state,
          postalCode: v.postalCode,
          notes: v.notes,
        }
      }
      if (!isGateway && v.paymentStatus !== order.paymentStatus) payload.paymentStatus = v.paymentStatus

      await updateOrderDetails(order.id, payload)
      if (v.status !== order.status) {
        try {
          await updateOrderStatus(order.id, v.status)
        } catch (error) {
          // The details above are already saved; say so rather than implying nothing happened.
          throw new Error(`${t('orders.saveFailedStatus')} ${extractErrorMessage(error, '')}`.trim())
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      toast.success(t('orders.saved'))
      navigate(`/admin/orders/${order.id}`)
    },
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      toast.error(extractErrorMessage(error, t('errors.generic')))
    },
    onSettled: () => setConfirmStatus(null),
  })

  function onSubmit(v: FormValues) {
    // Cancelling frees stock and refunding can move real money: neither can be undone.
    if (v.status !== order.status && TERMINAL.includes(v.status)) setConfirmStatus(v)
    else saveMutation.mutate(v)
  }

  const steps = [t('orders.stepCustomer'), t('orders.stepItems'), t('orders.stepShipping'), t('orders.stepPayment')]
  const isLast = step === steps.length - 1
  const itemsSubtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {t('orders.editPageTitle')} · {order.orderNumber}
          </h1>
          <p className="text-sm text-gray-500">{t('orders.editPageSubtitle')}</p>
        </div>
        <Link to={`/admin/orders/${order.id}`}>
          <Button variant="secondary">
            <ArrowLeftIcon className="h-4 w-4" />
            {t('orders.back')}
          </Button>
        </Link>
      </div>

      {closed ? (
        <Card className="text-sm text-gray-600">{t('orders.statusLockedPage', { status: order.status })}</Card>
      ) : (
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
          <Card className="mb-4">
            <CheckoutSteps steps={steps} current={step} onGoTo={setStep} freeNavigation />
          </Card>

          {pricingLocked && (step === 1 || step === 2) && (
            <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {t('orders.cardLocked')}
            </p>
          )}

          {step === 0 && (
            <Card className="flex flex-col gap-4">
              <h2 className="font-semibold text-gray-900">{steps[0]}</h2>
              <Input
                label={t('storefront.customerName')}
                {...register('customerName', { required: true, minLength: 2 })}
                error={formState.errors.customerName && t('errors.required')}
              />
              <Input label={t('storefront.customerEmail')} type="email" {...register('customerEmail')} />
              <Input label={t('storefront.customerPhone')} {...register('customerPhone')} />
            </Card>
          )}

          {step === 1 && (
            <ItemsStep
              lines={lines}
              setLines={setLines}
              editable={itemsEditable}
              deletedProduct={!pricingLocked && !itemsEditable}
              subtotal={itemsSubtotal}
              symbol={symbol}
              position={position}
            />
          )}

          {step === 2 && (
            <Card className="flex flex-col gap-4">
              <h2 className="font-semibold text-gray-900">{steps[2]}</h2>
              <div className="flex flex-col gap-1">
                <label htmlFor="shippingId" className="text-sm font-medium text-gray-700">
                  {t('orders.shippingMethod')}
                </label>
                <select id="shippingId" disabled={pricingLocked} className={selectClass} {...register('shippingId')}>
                  <option value="">{t('orders.pickup')}</option>
                  {shippings?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {formatMoney(s.cost, symbol, position)}
                    </option>
                  ))}
                </select>
              </div>
              {shippingId && (
                <>
                  <Input label={t('storefront.addressLine1')} {...register('line1')} />
                  <Input label={t('storefront.addressLine2')} {...register('line2')} />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Input label={t('storefront.city')} {...register('city')} />
                    <Input label={t('storefront.state')} {...register('state')} />
                    <Input label={t('storefront.postalCode')} {...register('postalCode')} />
                  </div>
                  <Input label={t('storefront.deliveryNotes')} {...register('notes')} />
                </>
              )}
            </Card>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <Card className="flex flex-col gap-4">
                <h2 className="font-semibold text-gray-900">{t('orders.stepPayment')}</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">{t('orders.paymentMethod')}</span>
                    <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700 sm:py-2">
                      {order.fulfillmentMethod}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="paymentStatus" className="text-sm font-medium text-gray-700">
                      {t('orders.paymentStatus')}
                    </label>
                    <select id="paymentStatus" disabled={isGateway} className={selectClass} {...register('paymentStatus')}>
                      <option value="PENDING">{t('orders.paymentPending')}</option>
                      <option value="PAID">{t('orders.paymentPaid')}</option>
                    </select>
                    <p className="text-xs text-gray-500">
                      {isGateway ? t('orders.paymentGatewayHint') : t('orders.paymentManualHint')}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-gray-50 p-4 text-sm">
                  <p className="mb-2 font-medium text-gray-900">{t('orders.currentTotals')}</p>
                  <TotalRow label={t('storefront.subtotal')} value={formatMoney(order.subtotal, symbol, position)} />
                  <TotalRow label={t('storefront.tax')} value={formatMoney(order.taxTotal, symbol, position)} />
                  {Number(order.discountTotal) > 0 && (
                    <TotalRow
                      label={t('storefront.discount')}
                      value={`−${formatMoney(order.discountTotal, symbol, position)}`}
                    />
                  )}
                  <TotalRow label={t('storefront.shipping')} value={formatMoney(order.shippingTotal, symbol, position)} />
                  <div className="mt-1 flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
                    <span>{t('storefront.total')}</span>
                    <span className="tabular-nums">{formatMoney(order.grandTotal, symbol, position)}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{t('orders.totalsHint')}</p>
                </div>
              </Card>

              <Card className="flex flex-col gap-1">
                <h2 className="font-semibold text-gray-900">{t('orders.orderStatus')}</h2>
                <select
                  aria-label={t('orders.orderStatus')}
                  className={selectClass}
                  {...register('status')}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Card>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              {t('orders.previous')}
            </Button>
            <p className="hidden text-xs text-gray-500 sm:block">{t('orders.unsavedHint')}</p>
            <div className="flex gap-2">
              {!isLast && (
                <Button type="button" variant="secondary" onClick={() => setStep((s) => s + 1)}>
                  {t('orders.next')}
                </Button>
              )}
              <Button type="submit" loading={saveMutation.isPending} disabled={lines.length === 0}>
                {t('orders.saveChanges')}
              </Button>
            </div>
          </div>
        </form>
      )}

      {confirmStatus && (
        <Modal title={t('orders.changeStatusTitle', { status: confirmStatus.status })} onClose={() => setConfirmStatus(null)}>
          <p className="text-sm text-gray-600">
            {confirmStatus.status === 'REFUNDED' ? t('orders.refundConfirm') : t('orders.cancelConfirm')}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmStatus(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" loading={saveMutation.isPending} onClick={() => saveMutation.mutate(confirmStatus)}>
              {t('orders.confirm')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5 text-gray-600">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function ItemsStep({
  lines,
  setLines,
  editable,
  deletedProduct,
  subtotal,
  symbol,
  position,
}: {
  lines: Line[]
  setLines: (next: Line[]) => void
  editable: boolean
  deletedProduct: boolean
  subtotal: number
  symbol: string
  position: 'pre' | 'post'
}) {
  const { t } = useTranslation()
  const [addProductId, setAddProductId] = useState('')
  const [addVariantId, setAddVariantId] = useState('')
  const [addQty, setAddQty] = useState(1)

  const { data: products } = useQuery({
    queryKey: ['products', 'for-order-edit'],
    queryFn: () => listProducts({ limit: 100, isActive: true }),
    enabled: editable,
  })
  const product = products?.items.find((p) => p.id === addProductId)
  const needsVariant = Boolean(product?.hasVariants && product.variants.length > 0)
  const variant = product?.variants.find((v) => v.id === addVariantId)
  const canAdd = Boolean(product) && (!needsVariant || Boolean(variant)) && addQty >= 1

  function setQuantity(index: number, quantity: number) {
    setLines(lines.map((l, i) => (i === index ? { ...l, quantity: Math.max(1, Math.floor(quantity) || 1) } : l)))
  }

  function addLine() {
    if (!product || !canAdd) return
    const next: Line = {
      productId: product.id,
      variantId: variant?.id ?? null,
      name: product.name,
      variantName: variant?.name ?? null,
      unitPrice: Number(variant?.price ?? product.price),
      quantity: addQty,
      isNew: true,
    }
    const same = lines.findIndex((l) => lineKey(l) === lineKey(next))
    // The same product can't appear twice: merge into the existing line.
    setLines(same >= 0 ? lines.map((l, i) => (i === same ? { ...l, quantity: l.quantity + addQty } : l)) : [...lines, next])
    setAddProductId('')
    setAddVariantId('')
    setAddQty(1)
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-semibold text-gray-900">{t('orders.stepItems')}</h2>
      {deletedProduct && <p className="text-sm text-amber-800">{t('orders.itemsDeletedProduct')}</p>}
      {editable && <p className="text-xs text-gray-500">{t('orders.itemsKeepPrice')}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2 pr-3 font-medium">{t('orders.product')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('orders.unitPrice')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('orders.quantity')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('orders.lineTotal')}</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lines.map((l, index) => (
              <tr key={lineKey(l)}>
                <td className="py-3 pr-3 text-gray-900">
                  {l.name}
                  {l.variantName ? <span className="text-gray-500"> ({l.variantName})</span> : null}
                  {l.isNew && (
                    <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                      {t('orders.newLine')}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-gray-600">
                  {formatMoney(l.unitPrice, symbol, position)}
                </td>
                <td className="px-3 py-3 text-right">
                  <QuantityInput
                    value={l.quantity}
                    disabled={!editable}
                    label={`${t('orders.quantity')} ${l.name}`}
                    onChange={(q) => setQuantity(index, q)}
                  />
                </td>
                <td className="px-3 py-3 text-right font-medium tabular-nums text-gray-900">
                  {formatMoney(l.unitPrice * l.quantity, symbol, position)}
                </td>
                <td className="py-3 text-right">
                  <button
                    type="button"
                    disabled={!editable || lines.length <= 1}
                    title={lines.length <= 1 ? t('orders.itemsNeedOne') : undefined}
                    aria-label={t('orders.removeItem', { name: l.name })}
                    onClick={() => setLines(lines.filter((_, i) => i !== index))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between border-t border-gray-100 pt-3 text-sm font-medium text-gray-900">
        <span>{t('orders.itemsSubtotal')}</span>
        <span className="tabular-nums">{formatMoney(subtotal, symbol, position)}</span>
      </div>

      {editable && (
        <div className="rounded-lg border border-dashed border-gray-300 p-4">
          <p className="mb-3 text-sm font-medium text-gray-700">{t('orders.addItem')}</p>
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_90px_auto]">
            <select
              aria-label={t('orders.product')}
              className={selectClass}
              value={addProductId}
              onChange={(e) => {
                setAddProductId(e.target.value)
                setAddVariantId('')
              }}
            >
              <option value="">{t('orders.chooseProduct')}</option>
              {products?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {formatMoney(p.price, symbol, position)}
                </option>
              ))}
            </select>
            {needsVariant ? (
              <select
                aria-label={t('orders.chooseVariant')}
                className={selectClass}
                value={addVariantId}
                onChange={(e) => setAddVariantId(e.target.value)}
              >
                <option value="">{t('orders.chooseVariant')}</option>
                {product?.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {formatMoney(v.price, symbol, position)}
                  </option>
                ))}
              </select>
            ) : (
              <span />
            )}
            <QuantityInput value={addQty} label={t('orders.quantity')} onChange={setAddQty} className="py-3 sm:py-2" />
            <Button type="button" variant="secondary" disabled={!canAdd} onClick={addLine}>
              {t('orders.addToOrder')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

/**
 * A whole-number field that can be cleared and retyped. Binding the number straight to the
 * state snapped an emptied field back to 1, so replacing "3" with "5" by backspacing gave
 * "15". The text is kept locally while typing and only valid quantities (>= 1) are reported.
 */
function QuantityInput({
  value,
  onChange,
  label,
  disabled,
  className = 'py-2',
}: {
  value: number
  onChange: (quantity: number) => void
  label: string
  disabled?: boolean
  className?: string
}) {
  const [text, setText] = useState(String(value))
  // Follows outside changes (e.g. merging into an existing line) without fighting the user's typing.
  useEffect(() => {
    setText((current) => (Number(current) === value ? current : String(value)))
  }, [value])

  return (
    <input
      type="number"
      min={1}
      step={1}
      inputMode="numeric"
      value={text}
      disabled={disabled}
      aria-label={label}
      onChange={(e) => {
        setText(e.target.value)
        const q = Math.floor(Number(e.target.value))
        if (e.target.value !== '' && q >= 1) onChange(q)
      }}
      onBlur={() => setText(String(value))}
      className={`w-20 rounded-lg border border-gray-300 px-2 text-right text-sm tabular-nums disabled:bg-gray-50 ${className}`}
    />
  )
}
