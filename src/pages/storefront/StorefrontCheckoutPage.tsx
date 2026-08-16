import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStorefront } from '@/hooks/useStorefront'
import { useCartStore } from '@/store/cart.store'
import { createOrder, quoteOrder } from '@/services/orders.service'
import { createStripeCheckout } from '@/services/payments.service'
import { listPublicShippings } from '@/services/shipping.service'
import { formatMoney } from '@/utils/format'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { BackLink } from '@/components/storefront/BackLink'
import { CheckoutSteps } from '@/components/storefront/CheckoutSteps'
import { extractErrorMessage } from '@/services/api-client'
import type { FulfillmentMethod } from '@/types/api'

const schema = z
  .object({
    customerName: z.string().min(2),
    customerPhone: z.string().min(6),
    customerEmail: z.string().email().optional().or(z.literal('')),
    shippingId: z.string(),
    address: z.object({
      line1: z.string(),
      line2: z.string(),
      city: z.string(),
      state: z.string(),
      postalCode: z.string(),
      notes: z.string(),
    }),
    fulfillmentMethod: z.enum(['WHATSAPP', 'TELEGRAM', 'STRIPE']),
  })
  // An address is only meaningful when something is being delivered; picking up
  // in store must not demand one.
  .superRefine((values, ctx) => {
    if (!values.shippingId) return
    if (values.address.line1.trim().length < 4) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['address', 'line1'], message: 'required' })
    }
    if (values.address.city.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['address', 'city'], message: 'required' })
    }
  })

type FormValues = z.infer<typeof schema>

const STEP_FIELDS = [
  ['customerName', 'customerPhone', 'customerEmail'],
  ['shippingId', 'address.line1', 'address.city', 'address.postalCode'],
  ['fulfillmentMethod'],
] as const

export function StorefrontCheckoutPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tenant, slug, path } = useStorefront()
  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clear)

  const [step, setStep] = useState(0)
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const symbol = tenant.currencySymbol
  const position = tenant.currencySymbolPosition as 'pre' | 'post'

  const { data: shippings } = useQuery({
    queryKey: ['storefront-shippings', slug],
    queryFn: () => listPublicShippings(slug),
  })

  const { register, handleSubmit, watch, setValue, trigger, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    // Steps advance through trigger(), not submit, so the default onSubmit mode
    // would leave an error sitting under a field the customer already fixed.
    mode: 'onTouched',
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      shippingId: '',
      address: { line1: '', line2: '', city: '', state: '', postalCode: '', notes: '' },
      fulfillmentMethod: tenant.whatsappEnabled ? 'WHATSAPP' : tenant.telegramEnabled ? 'TELEGRAM' : 'STRIPE',
    },
  })
  const { errors } = formState

  const shippingId = watch('shippingId')
  const fulfillmentMethod = watch('fulfillmentMethod')

  const orderItems = useMemo(
    () => items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
    [items],
  )

  // Every figure the customer sees comes from here — the same code that prices
  // the order on submit, so the quoted total and the charged total are one number.
  const { data: quote, isFetching: quoting } = useQuery({
    queryKey: ['checkout-quote', slug, orderItems, appliedCoupon, shippingId],
    queryFn: () =>
      quoteOrder(slug, {
        items: orderItems,
        couponCode: appliedCoupon || undefined,
        shippingId: shippingId || undefined,
      }),
    enabled: orderItems.length > 0,
    placeholderData: keepPreviousData,
  })

  useEffect(() => {
    if (items.length === 0) navigate(path('/cart'), { replace: true })
  }, [items.length, navigate, path])

  // The server is the authority on whether a code applies, so a rejected one is
  // dropped here rather than left looking active.
  useEffect(() => {
    if (quote?.couponError) {
      toast.error(quote.couponError)
      setAppliedCoupon('')
    }
  }, [quote?.couponError])

  const isLastStep = step === STEP_FIELDS.length - 1

  async function nextStep() {
    if (await trigger(STEP_FIELDS[step] as unknown as (keyof FormValues)[])) {
      setStep((s) => Math.min(STEP_FIELDS.length - 1, s + 1))
    }
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const result = await createOrder(slug, {
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        customerEmail: values.customerEmail || undefined,
        couponCode: appliedCoupon || undefined,
        shippingId: values.shippingId || undefined,
        fulfillmentMethod: values.fulfillmentMethod as FulfillmentMethod,
        // Only sent for delivery; pickup orders carry no address.
        shippingAddress: values.shippingId ? values.address : undefined,
        items: orderItems,
      })

      if (result.fulfillment.type === 'WHATSAPP') {
        clearCart()
        window.open(result.fulfillment.redirectUrl, '_blank')
        navigate(path(`/order-confirmed/${result.order.id}`), { state: { order: result.order } })
        return
      }

      if (result.fulfillment.type === 'TELEGRAM') {
        clearCart()
        navigate(path(`/order-confirmed/${result.order.id}`), { state: { order: result.order } })
        return
      }

      const checkout = await createStripeCheckout(slug, {
        orderId: result.order.id,
        successUrl: `${window.location.origin}${path(`/order-confirmed/${result.order.id}`)}`,
        cancelUrl: `${window.location.origin}${path('/checkout')}`,
      })
      clearCart()
      window.location.href = checkout.checkoutUrl
    } catch (error) {
      toast.error(extractErrorMessage(error, t('errors.generic')))
    } finally {
      setSubmitting(false)
    }
  }

  const methods: { value: FulfillmentMethod; label: string; hint: string; enabled: boolean }[] = [
    {
      value: 'WHATSAPP',
      label: t('storefront.checkoutWhatsapp'),
      hint: t('storefront.checkoutWhatsappHint'),
      enabled: tenant.whatsappEnabled,
    },
    {
      value: 'TELEGRAM',
      label: t('storefront.checkoutTelegram'),
      hint: t('storefront.checkoutTelegramHint'),
      enabled: tenant.telegramEnabled,
    },
    { value: 'STRIPE', label: t('storefront.checkoutCard'), hint: t('storefront.checkoutCardHint'), enabled: true },
  ]

  return (
    <div>
      <BackLink fallbackTo={path('/cart')} label={t('nav.cart')} className="mb-5" />
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('storefront.checkout')}</h1>

      <div className="mt-6">
        <CheckoutSteps
          steps={[t('storefront.stepContact'), t('storefront.stepDelivery'), t('storefront.stepPayment')]}
          current={step}
          onGoTo={setStep}
        />
      </div>

      {/*
        No button in here is type="submit", and the only native submit path —
        pressing Enter in a field — advances a step instead of ordering.

        A single button that flips from "button" to "submit" as the step changes
        places the order on the click that reaches the last step: React applies
        the state update synchronously for click events, so the browser runs the
        default action against a button that has already become a submit.
      */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!isLastStep) void nextStep()
        }}
        className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]"
      >
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="font-semibold text-gray-900">{t('storefront.stepContact')}</h2>
              <Input
                label={t('storefront.customerName')}
                {...register('customerName')}
                error={errors.customerName && t('errors.required')}
              />
              <Input
                label={t('storefront.customerPhone')}
                placeholder="+15551234567"
                {...register('customerPhone')}
                error={errors.customerPhone && t('storefront.phoneHint')}
              />
              <Input
                label={t('storefront.customerEmail')}
                type="email"
                {...register('customerEmail')}
                error={errors.customerEmail && t('storefront.emailInvalid')}
              />
              <p className="text-xs text-gray-500">{t('storefront.contactHint')}</p>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <h2 className="font-semibold text-gray-900">{t('storefront.stepDelivery')}</h2>

              <div className="flex flex-col gap-2">
                <OptionCard
                  selected={!shippingId}
                  onSelect={() => setValue('shippingId', '')}
                  title={t('storefront.pickup')}
                  hint={t('storefront.pickupHint')}
                />
                {shippings?.map((s) => (
                  <OptionCard
                    key={s.id}
                    selected={shippingId === s.id}
                    onSelect={() => setValue('shippingId', s.id)}
                    title={s.name}
                    hint={s.location?.name}
                    trailing={formatMoney(s.cost, symbol, position)}
                  />
                ))}
              </div>

              {shippingId && (
                <div className="mt-2 flex flex-col gap-4 border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-medium text-gray-700">{t('storefront.deliveryAddress')}</h3>
                  <Input
                    label={t('storefront.addressLine1')}
                    {...register('address.line1')}
                    error={errors.address?.line1 && t('errors.required')}
                  />
                  <Input label={t('storefront.addressLine2')} {...register('address.line2')} />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Input
                      label={t('storefront.city')}
                      {...register('address.city')}
                      error={errors.address?.city && t('errors.required')}
                    />
                    <Input label={t('storefront.state')} {...register('address.state')} />
                    <Input label={t('storefront.postalCode')} {...register('address.postalCode')} />
                  </div>
                  <Input label={t('storefront.deliveryNotes')} {...register('address.notes')} />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="font-semibold text-gray-900">{t('storefront.stepPayment')}</h2>
              <div className="flex flex-col gap-2">
                {methods
                  .filter((m) => m.enabled)
                  .map((m) => (
                    <OptionCard
                      key={m.value}
                      selected={fulfillmentMethod === m.value}
                      onSelect={() => setValue('fulfillmentMethod', m.value)}
                      title={m.label}
                      hint={m.hint}
                    />
                  ))}
              </div>

              <div className="mt-2 rounded-lg bg-gray-50 p-4 text-sm">
                <h3 className="mb-2 font-medium text-gray-900">{t('storefront.reviewTitle')}</h3>
                <ReviewRow label={t('storefront.customerName')} value={watch('customerName')} />
                <ReviewRow label={t('storefront.customerPhone')} value={watch('customerPhone')} />
                {watch('customerEmail') && (
                  <ReviewRow label={t('storefront.customerEmail')} value={watch('customerEmail') ?? ''} />
                )}
                <ReviewRow
                  label={t('storefront.shipping')}
                  value={
                    shippingId
                      ? [
                          shippings?.find((s) => s.id === shippingId)?.name,
                          watch('address.line1'),
                          watch('address.city'),
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      : t('storefront.pickup')
                  }
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="text-sm font-medium text-gray-500 transition-colors hover:text-brand-700 disabled:invisible"
            >
              {t('common.back')}
            </button>

            <Button
              type="button"
              loading={isLastStep && submitting}
              disabled={isLastStep && (quoting || !quote)}
              onClick={() => void (isLastStep ? handleSubmit(onSubmit)() : nextStep())}
            >
              {isLastStep ? t('storefront.placeOrder') : t('storefront.continue')}
            </Button>
          </div>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-gray-900">{t('storefront.orderSummary')}</h2>

            <div className="mt-4 flex flex-col gap-2">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantId ?? ''}`} className="flex justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-gray-600">
                    {item.quantity} × {item.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-gray-600">
                    {formatMoney(item.unitPrice * item.quantity, symbol, position)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4">
              <span className="mb-1 block text-sm font-medium text-gray-700">{t('storefront.coupon')}</span>
              <div className="flex gap-2">
                <Input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="CODE"
                  className="min-w-0 flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!couponInput || quoting}
                  onClick={() => setAppliedCoupon(couponInput.trim())}
                >
                  {t('storefront.applyCoupon')}
                </Button>
              </div>
              {quote?.coupon && (
                <p className="mt-1 text-xs font-medium text-emerald-600">
                  {t('storefront.couponApplied', { code: quote.coupon.code })}
                </p>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 text-sm">
              {quote ? (
                <>
                  <SummaryRow label={t('storefront.subtotal')} value={formatMoney(quote.subtotal, symbol, position)} />
                  {quote.taxTotal > 0 && (
                    <SummaryRow label={t('storefront.tax')} value={formatMoney(quote.taxTotal, symbol, position)} />
                  )}
                  {quote.discountTotal > 0 && (
                    <SummaryRow
                      label={t('storefront.discount')}
                      value={`−${formatMoney(quote.discountTotal, symbol, position)}`}
                      tone="positive"
                    />
                  )}
                  <SummaryRow
                    label={t('storefront.shipping')}
                    value={
                      quote.shippingTotal > 0
                        ? formatMoney(quote.shippingTotal, symbol, position)
                        : t('storefront.free')
                    }
                  />
                  <div className="mt-1 flex items-center justify-between border-t border-gray-100 pt-3 text-base font-semibold text-gray-900">
                    <span>{t('storefront.total')}</span>
                    <span className="flex items-center gap-2 tabular-nums">
                      {quoting && <Spinner className="h-3.5 w-3.5" />}
                      {formatMoney(quote.grandTotal, symbol, position)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-center py-4">
                  <Spinner className="h-5 w-5" />
                </div>
              )}
            </div>
          </div>
        </aside>
      </form>
    </div>
  )
}

function OptionCard({
  selected,
  onSelect,
  title,
  hint,
  trailing,
}: {
  selected: boolean
  onSelect: () => void
  title: string
  hint?: string
  trailing?: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
        selected ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:border-brand-500/60'
      }`}
    >
      <span className="flex items-center gap-3">
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
            selected ? 'border-brand-600' : 'border-gray-300'
          }`}
        >
          {selected && <span className="h-2 w-2 rounded-full bg-brand-600" />}
        </span>
        <span>
          <span className={`block text-sm ${selected ? 'font-medium text-brand-700' : 'text-gray-900'}`}>{title}</span>
          {hint && <span className="block text-xs text-gray-500">{hint}</span>}
        </span>
      </span>
      {trailing && <span className="shrink-0 text-sm tabular-nums text-gray-600">{trailing}</span>}
    </button>
  )
}

function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: 'positive' }) {
  return (
    <div className={`flex items-center justify-between ${tone === 'positive' ? 'text-emerald-600' : 'text-gray-600'}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-0.5">
      <span className="shrink-0 text-gray-500">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-gray-900">{value}</span>
    </div>
  )
}
