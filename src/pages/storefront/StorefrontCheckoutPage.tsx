import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStorefront } from '@/hooks/useStorefront'
import { useCartStore } from '@/store/cart.store'
import { createOrder } from '@/services/orders.service'
import { createStripeCheckout } from '@/services/payments.service'
import { listPublicShippings } from '@/services/shipping.service'
import { validateCoupon, type CouponValidation } from '@/services/coupons.service'
import { formatMoney } from '@/utils/format'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { extractErrorMessage } from '@/services/api-client'
import type { FulfillmentMethod } from '@/types/api'

const schema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(6),
  customerEmail: z.string().email().optional().or(z.literal('')),
})
type FormValues = z.infer<typeof schema>

export function StorefrontCheckoutPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tenant, slug, path } = useStorefront()
  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clear)
  const [method, setMethod] = useState<FulfillmentMethod>(tenant.whatsappEnabled ? 'WHATSAPP' : 'STRIPE')
  const [shippingId, setShippingId] = useState<string>('')
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState<CouponValidation | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { data: shippings } = useQuery({ queryKey: ['storefront-shippings', slug], queryFn: () => listPublicShippings(slug) })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const symbol = tenant.currencySymbol
  const position = tenant.currencySymbolPosition as 'pre' | 'post'
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const shippingCost = shippings?.find((s) => s.id === shippingId)?.cost ? Number(shippings.find((s) => s.id === shippingId)!.cost) : 0
  const discount = coupon?.discountAmount ?? 0
  const estimatedTotal = Math.max(0, subtotal - discount) + shippingCost

  async function handleApplyCoupon() {
    if (!couponInput) return
    setValidatingCoupon(true)
    setCouponError(null)
    try {
      const result = await validateCoupon(slug, couponInput, subtotal)
      setCoupon(result)
    } catch (error) {
      setCoupon(null)
      setCouponError(extractErrorMessage(error, 'Invalid coupon'))
    } finally {
      setValidatingCoupon(false)
    }
  }

  async function onSubmit(values: FormValues) {
    if (items.length === 0) return
    setSubmitting(true)
    try {
      const result = await createOrder(slug, {
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        customerEmail: values.customerEmail || undefined,
        couponCode: coupon?.code,
        shippingId: shippingId || undefined,
        fulfillmentMethod: method,
        items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
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

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('storefront.checkout')}</h1>
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-4">
        <Input label={t('storefront.customerName')} {...register('customerName')} error={errors.customerName?.message} />
        <Input label={t('storefront.customerPhone')} {...register('customerPhone')} error={errors.customerPhone?.message} />
        <Input label={t('storefront.customerEmail')} type="email" {...register('customerEmail')} error={errors.customerEmail?.message} />

        {!!shippings?.length && (
          <div>
            <span className="mb-2 block text-sm font-medium text-gray-700">{t('storefront.shipping')}</span>
            <div className="flex flex-col gap-2">
              <label
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                  !shippingId ? 'border-brand-600 bg-brand-50' : 'border-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <input type="radio" checked={!shippingId} onChange={() => setShippingId('')} />
                  No shipping
                </span>
              </label>
              {shippings.map((s) => (
                <label
                  key={s.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                    shippingId === s.id ? 'border-brand-600 bg-brand-50' : 'border-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input type="radio" checked={shippingId === s.id} onChange={() => setShippingId(s.id)} />
                    {s.name} {s.location ? `(${s.location.name})` : ''}
                  </span>
                  <span className="text-gray-500">{formatMoney(s.cost, symbol, position)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <span className="mb-1 block text-sm font-medium text-gray-700">{t('storefront.coupon')}</span>
          <div className="flex gap-2">
            <Input
              value={couponInput}
              onChange={(e) => {
                setCouponInput(e.target.value)
                setCoupon(null)
                setCouponError(null)
              }}
              placeholder="CODE"
              className="flex-1"
            />
            <Button type="button" variant="secondary" loading={validatingCoupon} onClick={() => void handleApplyCoupon()}>
              {t('storefront.applyCoupon')}
            </Button>
          </div>
          {couponError && <p className="mt-1 text-xs text-red-600">{couponError}</p>}
          {coupon && <p className="mt-1 text-xs text-green-600">Coupon "{coupon.code}" applied</p>}
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-gray-700">{t('storefront.checkout')}</span>
          <div className="flex flex-col gap-2">
            {tenant.whatsappEnabled && (
              <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${method === 'WHATSAPP' ? 'border-brand-600 bg-brand-50' : 'border-gray-300'}`}>
                <input type="radio" checked={method === 'WHATSAPP'} onChange={() => setMethod('WHATSAPP')} />
                {t('storefront.checkoutWhatsapp')}
              </label>
            )}
            {tenant.telegramEnabled && (
              <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${method === 'TELEGRAM' ? 'border-brand-600 bg-brand-50' : 'border-gray-300'}`}>
                <input type="radio" checked={method === 'TELEGRAM'} onChange={() => setMethod('TELEGRAM')} />
                {t('storefront.checkoutTelegram')}
              </label>
            )}
            <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${method === 'STRIPE' ? 'border-brand-600 bg-brand-50' : 'border-gray-300'}`}>
              <input type="radio" checked={method === 'STRIPE'} onChange={() => setMethod('STRIPE')} />
              {t('storefront.checkoutCard')}
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-1 border-t border-gray-100 pt-4 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>{t('storefront.subtotal')}</span>
            <span>{formatMoney(subtotal, symbol, position)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>{t('storefront.discount')}</span>
              <span>-{formatMoney(discount, symbol, position)}</span>
            </div>
          )}
          {shippingCost > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>{t('storefront.shipping')}</span>
              <span>{formatMoney(shippingCost, symbol, position)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold text-gray-900">
            <span>{t('storefront.total')}</span>
            <span>{formatMoney(estimatedTotal, symbol, position)}</span>
          </div>
          <p className="text-xs text-gray-400">Tax calculated at checkout confirmation.</p>
        </div>

        <Button type="submit" loading={submitting} disabled={items.length === 0}>
          {t('storefront.placeOrder')}
        </Button>
      </form>
    </div>
  )
}
