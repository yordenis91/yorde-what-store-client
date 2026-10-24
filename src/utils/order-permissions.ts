import type { Order, OrderStatus } from '@/types/api'

type OrderPaymentInfo = Pick<Order, 'paymentStatus' | 'fulfillmentMethod'>

/** A card order that has been paid: cancelling it refunds it through the gateway. */
export function isPaidCardOrder(order: OrderPaymentInfo): boolean {
  return order.paymentStatus === 'PAID' && (order.fulfillmentMethod === 'STRIPE' || order.fulfillmentMethod === 'MERCADOPAGO' || order.fulfillmentMethod === 'PAYPAL')
}

/**
 * Whether a collaborator (STAFF) may not move this order to `status`: marking it refunded, or cancelling a
 * paid card order, returns money through the owner's gateway credentials and is OWNER-only on the API.
 */
export function needsOwnerToSet(status: OrderStatus, order: OrderPaymentInfo): boolean {
  return status === 'REFUNDED' || (status === 'CANCELLED' && isPaidCardOrder(order))
}

/** i18n key for the "this can't be undone" prompt shown before a terminal status is applied. */
export function terminalStatusConfirmKey(status: OrderStatus, order: OrderPaymentInfo): string {
  if (status === 'REFUNDED') return 'orders.refundConfirm'
  return isPaidCardOrder(order) ? 'orders.cancelPaidConfirm' : 'orders.cancelConfirm'
}
