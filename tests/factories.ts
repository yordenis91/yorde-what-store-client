import type { Product, PublicTenant } from '@/types/api'

/**
 * Shared fixtures. Kept minimal and overridable so each test states only the
 * fields it actually depends on.
 */

export function buildTenant(overrides: Partial<PublicTenant> = {}): PublicTenant {
  return {
    id: 'tenant-1',
    name: 'Vortex Beauty',
    slug: 'vortex',
    tagline: 'Handmade cosmetics',
    about: null,
    logoUrl: null,
    bannerUrl: null,
    theme: 'default',
    tracksInventory: false,
    currency: 'USD',
    currencySymbol: '$',
    currencySymbolPosition: 'pre',
    locale: 'en',
    socialLinks: {},
    whatsappEnabled: true,
    telegramEnabled: false,
    ...overrides,
  }
}

export function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    tenantId: 'tenant-1',
    name: 'Lavender soap',
    sku: 'SOAP-1',
    description: 'Cold pressed.',
    price: '25.00',
    cost: null,
    quantity: 0,
    hasVariants: false,
    isActive: true,
    isPublished: true,
    attributes: {},
    categories: [],
    taxes: [],
    variants: [],
    images: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  } as Product
}
