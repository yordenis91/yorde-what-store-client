import { useOutletContext } from 'react-router-dom'
import type { PublicTenant } from '@/types/api'

export function useStorefrontTenant() {
  return useOutletContext<{ tenant: PublicTenant }>().tenant
}
