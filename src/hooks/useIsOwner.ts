import { useAuthStore } from '@/store/auth.store'

/**
 * Whether this session acts as the store's owner. Refunds, cancelling a paid card order, order exports,
 * coupons and store settings are OWNER-only on the API (STAFF gets 403), so the screens hide or disable
 * them for a collaborator instead of letting them hit an error. An unknown role (not seen in practice:
 * the session always comes from /tenants/me) is not treated as a collaborator — the API stays the
 * authority and would answer 403.
 */
export function useIsOwner(): boolean {
  const myRole = useAuthStore((s) => s.activeTenant?.myRole)
  const impersonating = useAuthStore((s) => s.impersonation !== null)
  return impersonating || !myRole || myRole === 'OWNER'
}
