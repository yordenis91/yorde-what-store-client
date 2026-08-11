import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStorefrontTenant } from '@/hooks/useStorefrontTenant'
import { useCartStore } from '@/store/cart.store'
import { createOrder } from '@/services/orders.service'
import { createStripeCheckout } from '@/services/payments.service'
import { formatMoney } from '@/utils/format'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { extractErrorMessage } from '@/services/api-client'
import type { FulfillmentMethod } from '@/types/api'

const schema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(6),
  customerEmail: z.string().email().optional().or(z.literal('')),
  couponCode: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function StorefrontCheckoutPage() {
  const { slug = '' } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const tenant = useStorefrontTenant()
  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clear)
  const [method, setMethod] = useState<FulfillmentMethod>(tenant.whatsappEnabled ? 'WHATSAPP' : 'STRIPE')
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const symbol = tenant.currencySymbol
  const position = tenant.currencySymbolPosition as 'pre' | 'post'
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

  async function onSubmit(values: FormValues) {
    if (items.length === 0) return
    setSubmitting(true)
    try {
      const result = await createOrder(slug, {
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        customerEmail: values.customerEmail || undefined,
        couponCode: values.couponCode || undefined,
        fulfillmentMethod: method,
        items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
      })

      if (result.fulfillment.type === 'WHATSAPP') {
        clearCart()
        window.open(result.fulfillment.redirectUrl, '_blank')
        navigate(`/store/${slug}/order-confirmed/${result.order.id}`)
        return
      }

      if (result.fulfillment.type === 'TELEGRAM') {
        clearCart()
        navigate(`/store/${slug}/order-confirmed/${result.order.id}`)
        return
      }

      const checkout = await createStripeCheckout(slug, {
        orderId: result.order.id,
        successUrl: `${window.location.origin}/store/${slug}/order-confirmed/${result.order.id}`,
        cancelUrl: `${window.location.origin}/store/${slug}/checkout`,
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
        <Input label={t('storefront.coupon')} {...register('couponCode')} />

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

        <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-lg font-semibold text-gray-900">
          <span>{t('storefront.subtotal')}</span>
          <span>{formatMoney(subtotal, symbol, position)}</span>
        </div>

        <Button type="submit" loading={submitting} disabled={items.length === 0}>
          {t('storefront.placeOrder')}
        </Button>
      </form>
    </div>
  )
}
