import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import {
  activateTenant,
  createPlatformTenant,
  impersonateTenant,
  listPlatformTenants,
  purgePlatformTenant,
  suspendTenant,
  type CreatePlatformTenantPayload,
} from '@/services/platform.service'
import { getProfile } from '@/services/auth.service'
import { getCurrentTenant } from '@/services/tenants.service'
import { useAuthStore } from '@/store/auth.store'
import { formatDate } from '@/utils/format'
import { extractErrorMessage } from '@/services/api-client'
import type { PlatformTenantListItem, TenantStatus } from '@/types/api'

const STATUS_OPTIONS: TenantStatus[] = ['PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED', 'TRIAL_EXPIRED']

const STATUS_BADGE_CLASSES: Record<TenantStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-amber-100 text-amber-700',
  BANNED: 'bg-red-100 text-red-700',
  TRIAL_EXPIRED: 'bg-orange-100 text-orange-700',
}

function TenantStatusBadge({ status }: { status: TenantStatus }) {
  const { t } = useTranslation()
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[status]}`}>
      {t(`platformTenants.status.${status}`)}
    </span>
  )
}

const statusChangeSchema = z.object({
  reason: z.string().min(3).max(500),
})
type StatusChangeFormValues = z.infer<typeof statusChangeSchema>

/** Shared by the single-row and bulk suspend/activate actions — `targets` is one or many tenant ids. */
function StatusChangeModal({
  targets,
  toStatus,
  onClose,
  onDone,
}: {
  targets: string[]
  toStatus: 'SUSPENDED' | 'ACTIVE'
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StatusChangeFormValues>({ resolver: zodResolver(statusChangeSchema) })

  async function onSubmit(values: StatusChangeFormValues) {
    try {
      const action = toStatus === 'SUSPENDED' ? suspendTenant : activateTenant
      await Promise.all(targets.map((id) => action(id, values.reason)))
      onDone()
    } catch (error) {
      toast.error(extractErrorMessage(error, t('errors.generic')))
    }
  }

  return (
    <Modal title={t(toStatus === 'SUSPENDED' ? 'platformTenants.suspendTitle' : 'platformTenants.activateTitle')} onClose={onClose}>
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">{t('platformTenants.reasonLabel')}</label>
          <textarea
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            rows={3}
            placeholder={t('platformTenants.reasonPlaceholder')}
            {...register('reason')}
          />
          {errors.reason && <span className="text-xs text-red-600">{t('platformTenants.reasonRequired')}</span>}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant={toStatus === 'SUSPENDED' ? 'danger' : 'primary'} loading={isSubmitting}>
            {t('platformTenants.confirm')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

const impersonateSchema = z.object({ reason: z.string().max(500).optional() })
type ImpersonateFormValues = z.infer<typeof impersonateSchema>

function ImpersonateModal({
  tenant,
  onClose,
  onConfirm,
}: {
  tenant: PlatformTenantListItem
  onClose: () => void
  onConfirm: (reason: string | undefined) => Promise<void>
}) {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ImpersonateFormValues>({ resolver: zodResolver(impersonateSchema) })

  async function onSubmit(values: ImpersonateFormValues) {
    await onConfirm(values.reason)
  }

  return (
    <Modal title={t('platformTenants.impersonateTitle')} onClose={onClose}>
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-3">
        <p className="text-sm text-gray-700">
          <span className="font-medium">{tenant.name}</span>
        </p>
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{t('platformTenants.impersonateWarning')}</p>
        <Input label={t('platformTenants.impersonateReasonLabel')} {...register('reason')} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {t('platformTenants.confirm')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

interface PurgeFormValues {
  confirmSlug: string
}

/**
 * Irreversible — unlike suspend/activate/soft-delete, there is no undo.
 * Requires typing the tenant's own slug to confirm (the same pattern
 * GitHub/Shopify use before a destructive delete), so a misclick on the
 * wrong row can't destroy the wrong store. The API re-validates this
 * server-side regardless — the modal is a UX safeguard, not the boundary.
 */
function PurgeTenantModal({
  tenant,
  onClose,
  onDone,
}: {
  tenant: PlatformTenantListItem
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PurgeFormValues>({ defaultValues: { confirmSlug: '' } })

  async function onSubmit(values: PurgeFormValues) {
    try {
      await purgePlatformTenant(tenant.id, values.confirmSlug)
      toast.success(t('platformTenants.purgeSuccess'))
      onDone()
    } catch (error) {
      toast.error(extractErrorMessage(error, t('errors.generic')))
    }
  }

  const confirmSlug = watch('confirmSlug')

  return (
    <Modal title={t('platformTenants.purgeTitle', { name: tenant.name })} onClose={onClose}>
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-3">
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{t('platformTenants.purgeWarning')}</p>
        <p className="text-sm text-gray-700">
          {t('platformTenants.purgeConfirmLabel')} <span className="font-mono font-semibold">{tenant.slug}</span>
        </p>
        <Input
          {...register('confirmSlug', { required: true, validate: (v) => v === tenant.slug })}
          placeholder={tenant.slug}
          autoComplete="off"
          error={errors.confirmSlug ? t('platformTenants.purgeConfirmMismatch') : undefined}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="danger" loading={isSubmitting} disabled={confirmSlug !== tenant.slug}>
            {t('platformTenants.purgeConfirm')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

const createTenantSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers and dashes only'),
  ownerName: z.string().min(2).max(120),
  ownerEmail: z.string().email(),
  temporaryPassword: z.string().min(8).max(72),
})
type CreateTenantFormValues = z.infer<typeof createTenantSchema>

function CreateTenantModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTenantFormValues>({ resolver: zodResolver(createTenantSchema) })

  const mutation = useMutation({
    mutationFn: (values: CreatePlatformTenantPayload) => createPlatformTenant(values),
    onSuccess: () => {
      toast.success(t('platformTenants.createSuccess'))
      onCreated()
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  return (
    <Modal title={t('platformTenants.createTitle')} onClose={onClose}>
      <form
        onSubmit={(e) => void handleSubmit((values) => mutation.mutate(values))(e)}
        className="flex flex-col gap-3"
      >
        <Input label={t('platformTenants.storeName')} {...register('name')} error={errors.name?.message} />
        <Input label={t('platformTenants.storeSlug')} {...register('slug')} error={errors.slug?.message} />
        <Input label={t('platformTenants.ownerName')} {...register('ownerName')} error={errors.ownerName?.message} />
        <Input
          label={t('platformTenants.ownerEmail')}
          type="email"
          {...register('ownerEmail')}
          error={errors.ownerEmail?.message}
        />
        <Input
          label={t('platformTenants.temporaryPassword')}
          {...register('temporaryPassword')}
          error={errors.temporaryPassword?.message}
        />
        <p className="text-xs text-gray-500">{t('platformTenants.temporaryPasswordHint')}</p>
        <div className="flex justify-end gap-2">
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

type StatusAction = { kind: 'status'; toStatus: 'SUSPENDED' | 'ACTIVE'; targets: string[] }
type ImpersonateAction = { kind: 'impersonate'; tenant: PlatformTenantListItem }
type PurgeAction = { kind: 'purge'; tenant: PlatformTenantListItem }
type ModalState = StatusAction | ImpersonateAction | PurgeAction | { kind: 'create' } | null

export function PlatformTenantsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TenantStatus | ''>('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<ModalState>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['platform-tenants', page, search, status],
    queryFn: () => listPlatformTenants({ page, limit: 20, search: search || undefined, status: status || undefined }),
  })

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (!data) return
    setSelected((prev) => (prev.size === data.items.length ? new Set() : new Set(data.items.map((i) => i.id))))
  }

  function closeModalAndRefresh() {
    setModal(null)
    setSelected(new Set())
    void queryClient.invalidateQueries({ queryKey: ['platform-tenants'] })
  }

  /**
   * SPA navigate(), not a full reload: a reload would wipe the in-memory
   * state just set below and let useBootstrapAuth silently re-authenticate
   * as the admin via the (untouched) refresh cookie, reverting impersonation
   * before it ever renders. No stale-cache risk here either way — the
   * SUPER_ADMIN identity has no tenant-scoped queries cached to bleed from.
   */
  async function handleImpersonateConfirm(tenant: PlatformTenantListItem, reason: string | undefined) {
    try {
      const result = await impersonateTenant(tenant.id, reason)
      useAuthStore.getState().beginImpersonation({
        accessToken: result.accessToken,
        tenantId: result.tenantId,
        tenantName: result.tenantName,
        expiresAt: result.expiresAt,
      })
      const [profile, fullTenant] = await Promise.all([getProfile(), getCurrentTenant()])
      useAuthStore.getState().setSession({ user: profile, accessToken: result.accessToken })
      useAuthStore.getState().setActiveTenant(fullTenant)
      navigate('/admin')
    } catch (error) {
      toast.error(extractErrorMessage(error, t('errors.generic')))
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">{t('platformTenants.title')}</h1>
        <Button onClick={() => setModal({ kind: 'create' })}>{t('platformTenants.new')}</Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder={t('platformTenants.searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-sm"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as TenantStatus | '')
            setPage(1)
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
        >
          <option value="">{t('platformTenants.allStatuses')}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {t(`platformTenants.status.${s}`)}
            </option>
          ))}
        </select>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-brand-50 px-4 py-2">
          <span className="text-sm text-brand-800">{t('platformTenants.selected', { count: selected.size })}</span>
          <Button
            variant="secondary"
            onClick={() => setModal({ kind: 'status', toStatus: 'SUSPENDED', targets: Array.from(selected) })}
          >
            {t('platformTenants.bulkSuspend')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setModal({ kind: 'status', toStatus: 'ACTIVE', targets: Array.from(selected) })}
          >
            {t('platformTenants.bulkActivate')}
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={!!data && data.items.length > 0 && selected.size === data.items.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3">{t('platformTenants.columnStore')}</th>
                <th className="px-4 py-3">{t('platformTenants.columnOwner')}</th>
                <th className="px-4 py-3">{t('platformTenants.columnPlan')}</th>
                <th className="px-4 py-3">{t('platformTenants.columnProducts')}</th>
                <th className="px-4 py-3">{t('platformTenants.columnOrders')}</th>
                <th className="px-4 py-3">{t('platformTenants.columnCreated')}</th>
                <th className="px-4 py-3">{t('platformTenants.columnStatus')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data?.items.map((tenant) => (
                <tr key={tenant.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${tenant.name}`}
                      checked={selected.has(tenant.id)}
                      onChange={() => toggleSelected(tenant.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/platform/tenants/${tenant.id}`} className="font-medium text-brand-700 hover:underline">
                      {tenant.name}
                    </Link>
                    <div className="text-xs text-gray-500">{tenant.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{tenant.owner.name}</div>
                    <div className="text-xs text-gray-500">{tenant.owner.email}</div>
                  </td>
                  <td className="px-4 py-3">{tenant.subscriptions[0]?.plan.name ?? '—'}</td>
                  <td className="px-4 py-3">{tenant._count.products}</td>
                  <td className="px-4 py-3">{tenant._count.orders}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(tenant.createdAt)}</td>
                  <td className="px-4 py-3">
                    <TenantStatusBadge status={tenant.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {tenant.status === 'ACTIVE' ? (
                        <Button
                          variant="danger"
                          onClick={() => setModal({ kind: 'status', toStatus: 'SUSPENDED', targets: [tenant.id] })}
                        >
                          {t('platformTenants.suspend')}
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => setModal({ kind: 'status', toStatus: 'ACTIVE', targets: [tenant.id] })}
                        >
                          {t('platformTenants.activate')}
                        </Button>
                      )}
                      <Button variant="ghost" onClick={() => setModal({ kind: 'impersonate', tenant })}>
                        {t('platformTenants.impersonate')}
                      </Button>
                      <Button variant="danger" onClick={() => setModal({ kind: 'purge', tenant })}>
                        {t('platformTenants.purge')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-400">
                    {t('platformTenants.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && data.meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ←
          </Button>
          <span className="text-sm text-gray-500">
            {page} / {data.meta.totalPages}
          </span>
          <Button variant="secondary" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
            →
          </Button>
        </div>
      )}

      {modal?.kind === 'status' && (
        <StatusChangeModal
          targets={modal.targets}
          toStatus={modal.toStatus}
          onClose={() => setModal(null)}
          onDone={closeModalAndRefresh}
        />
      )}
      {modal?.kind === 'impersonate' && (
        <ImpersonateModal
          tenant={modal.tenant}
          onClose={() => setModal(null)}
          onConfirm={(reason) => handleImpersonateConfirm(modal.tenant, reason)}
        />
      )}
      {modal?.kind === 'create' && <CreateTenantModal onClose={() => setModal(null)} onCreated={closeModalAndRefresh} />}
      {modal?.kind === 'purge' && (
        <PurgeTenantModal tenant={modal.tenant} onClose={() => setModal(null)} onDone={closeModalAndRefresh} />
      )}
    </div>
  )
}
