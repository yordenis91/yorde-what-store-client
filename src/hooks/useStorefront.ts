import { useOutletContext } from 'react-router-dom'
import type { PublicTenant } from '@/types/api'

export interface StorefrontContext {
  tenant: PublicTenant
  /** Store slug, from the subdomain or from the `/store/:slug` route param. */
  slug: string
  /**
   * Builds an app path inside this storefront. Pages use it instead of
   * hardcoding `/store/${slug}`, which is only correct in path mode.
   */
  path: (subpath?: string) => string
}

/** Storefront context provided by PublicLayout. Only valid under its Outlet. */
export function useStorefront(): StorefrontContext {
  return useOutletContext<StorefrontContext>()
}

export function useStorefrontTenant(): PublicTenant {
  return useStorefront().tenant
}
