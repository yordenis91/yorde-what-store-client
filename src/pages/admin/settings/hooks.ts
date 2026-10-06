import { createContext, useContext, useEffect, useId } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { extractErrorMessage } from '@/services/api-client'
import { updateCurrentTenant } from '@/services/tenants.service'
import { useAuthStore } from '@/store/auth.store'
import type { Tenant } from '@/types/api'

export const SECTION_IDS = ['general', 'appearance', 'social', 'channels', 'payments', 'policies', 'email'] as const
export type SectionId = (typeof SECTION_IDS)[number]

/**
 * Whether this session may change the store's settings. PATCH /tenants/current
 * and both payment-settings endpoints are OWNER-only, so a collaborator gets a
 * read-only view and never triggers those calls. An unknown role (not seen in
 * practice: the session always comes from /tenants/me) is not treated as a
 * collaborator — the API stays the authority and would answer 403.
 */
export function useCanEditSettings() {
  const myRole = useAuthStore((s) => s.activeTenant?.myRole)
  const impersonating = useAuthStore((s) => s.impersonation !== null)
  return impersonating || !myRole || myRole === 'OWNER'
}

/** Lets a section tell the page it has unsaved edits, so switching sections can ask first. */
const DirtyContext = createContext<(reporter: string, dirty: boolean) => void>(() => undefined)
export const DirtyProvider = DirtyContext.Provider

/** Keyed per caller: the payments section has three forms on screen at once. */
export function useReportDirty(isDirty: boolean) {
  const report = useContext(DirtyContext)
  const reporter = useId()
  useEffect(() => {
    report(reporter, isDirty)
    return () => report(reporter, false)
  }, [isDirty, report, reporter])
}

/**
 * One tenant PATCH shared by every section. Each caller passes only the fields
 * of its own section: the API rejects unknown fields (forbidNonWhitelisted),
 * and a whole-tenant save would overwrite what someone else changed on another
 * device while this screen was open.
 */
export function useSaveTenantFields() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const mergeTenant = useAuthStore((s) => s.mergeTenant)
  return useMutation({
    mutationFn: (fields: Partial<Tenant>) => updateCurrentTenant(fields),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['current-tenant'] })
      mergeTenant(updated)
      toast.success(t('settings.saved'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })
}
