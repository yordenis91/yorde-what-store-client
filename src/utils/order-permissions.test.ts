import { describe, expect, it } from 'vitest'
import { isPaidCardOrder, needsOwnerToSet, terminalStatusConfirmKey } from './order-permissions'

const paidStripe = { paymentStatus: 'PAID', fulfillmentMethod: 'STRIPE' } as const
const unpaidStripe = { paymentStatus: 'PENDING', fulfillmentMethod: 'STRIPE' } as const
const paidZelle = { paymentStatus: 'PAID', fulfillmentMethod: 'ZELLE' } as const

describe('order permissions', () => {
  it('treats only a paid Stripe/MercadoPago order as a paid card order', () => {
    expect(isPaidCardOrder(paidStripe)).toBe(true)
    expect(isPaidCardOrder({ paymentStatus: 'PAID', fulfillmentMethod: 'MERCADOPAGO' })).toBe(true)
    expect(isPaidCardOrder({ paymentStatus: 'PAID', fulfillmentMethod: 'PAYPAL' })).toBe(true)
    expect(isPaidCardOrder({ paymentStatus: 'PENDING', fulfillmentMethod: 'PAYPAL' })).toBe(false)
    expect(isPaidCardOrder(unpaidStripe)).toBe(false)
    expect(isPaidCardOrder(paidZelle)).toBe(false)
  })

  it('reserves refunds, and cancelling a paid card order, for the owner', () => {
    expect(needsOwnerToSet('REFUNDED', unpaidStripe)).toBe(true)
    expect(needsOwnerToSet('CANCELLED', paidStripe)).toBe(true)
    // Cancelling a paid PayPal order refunds it through PayPal, so it is owner-only too.
    expect(needsOwnerToSet('CANCELLED', { paymentStatus: 'PAID', fulfillmentMethod: 'PAYPAL' })).toBe(true)
  })

  it('lets a collaborator cancel an order that moved no money, and make ordinary status changes', () => {
    expect(needsOwnerToSet('CANCELLED', unpaidStripe)).toBe(false)
    expect(needsOwnerToSet('CANCELLED', paidZelle)).toBe(false)
    expect(needsOwnerToSet('PROCESSING', paidStripe)).toBe(false)
  })

  it('warns that cancelling a paid card order refunds it', () => {
    expect(terminalStatusConfirmKey('CANCELLED', paidStripe)).toBe('orders.cancelPaidConfirm')
    expect(terminalStatusConfirmKey('CANCELLED', unpaidStripe)).toBe('orders.cancelConfirm')
    expect(terminalStatusConfirmKey('REFUNDED', paidStripe)).toBe('orders.refundConfirm')
  })
})
