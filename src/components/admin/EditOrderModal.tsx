import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { updateOrderDetails } from '@/services/orders.service'
import { extractErrorMessage } from '@/services/api-client'
import type { Order } from '@/types/api'

interface FormValues {
  customerName: string
  customerEmail: string
  customerPhone: string
  line1: string
  line2: string
  city: string
  state: string
  postalCode: string
  notes: string
}

/** Corrects who an order is for and where it goes. Items and totals are not editable on purpose. */
export function EditOrderModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  // A pickup order has no address to correct.
  const hasAddress = Boolean(order.shipping || order.shippingAddress)
  const address = order.shippingAddress

  const { register, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: {
      customerName: order.customerName,
      customerEmail: order.customerEmail ?? '',
      customerPhone: order.customerPhone ?? '',
      line1: address?.line1 ?? '',
      line2: address?.line2 ?? '',
      city: address?.city ?? '',
      state: address?.state ?? '',
      postalCode: address?.postalCode ?? '',
      notes: address?.notes ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      updateOrderDetails(order.id, {
        customerName: v.customerName.trim(),
        customerEmail: v.customerEmail.trim() || null,
        customerPhone: v.customerPhone.trim() || null,
        ...(hasAddress
          ? {
              shippingAddress: {
                line1: v.line1,
                line2: v.line2,
                city: v.city,
                state: v.state,
                postalCode: v.postalCode,
                notes: v.notes,
              },
            }
          : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      toast.success(t('orders.updated'))
      onClose()
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  return (
    <Modal title={`${t('orders.editOrder')} ${order.orderNumber}`} onClose={onClose}>
      <p className="mb-4 text-xs text-gray-500">{t('orders.editOrderHint')}</p>
      <form onSubmit={(e) => void handleSubmit((v) => mutation.mutate(v))(e)} className="flex flex-col gap-3">
        <div className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto px-0.5 pb-1">
          <Input
            label={t('storefront.customerName')}
            {...register('customerName', { required: true, minLength: 2 })}
            error={formState.errors.customerName && t('errors.required')}
          />
          <Input label={t('storefront.customerEmail')} type="email" {...register('customerEmail')} />
          <Input label={t('storefront.customerPhone')} {...register('customerPhone')} />
          {hasAddress && (
            <>
              <Input label={t('storefront.addressLine1')} {...register('line1')} />
              <Input label={t('storefront.addressLine2')} {...register('line2')} />
              <div className="grid grid-cols-2 gap-3">
                <Input label={t('storefront.city')} {...register('city')} />
                <Input label={t('storefront.state')} {...register('state')} />
              </div>
              <Input label={t('storefront.postalCode')} {...register('postalCode')} />
              <Input label={t('storefront.deliveryNotes')} {...register('notes')} />
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
