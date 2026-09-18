import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
  addTenantNote,
  getPlatformTenant,
  getTenantHistory,
  listTenantMembers,
  listTenantNotes,
  updatePlatformTenant,
} from '@/services/platform.service'
import { formatDate } from '@/utils/format'
import { extractErrorMessage } from '@/services/api-client'

type Tab = 'info' | 'stats' | 'members' | 'notes' | 'history'

const infoSchema = z.object({
  name: z.string().min(2).max(120),
  commissionRate: z
    .string()
    .refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100), {
      message: 'Must be a number between 0 and 100',
    }),
})
type InfoFormValues = z.infer<typeof infoSchema>

export function PlatformTenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('info')

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['platform-tenant', id],
    queryFn: () => getPlatformTenant(id!),
    enabled: !!id,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InfoFormValues>({ resolver: zodResolver(infoSchema) })

  useEffect(() => {
    if (tenant) reset({ name: tenant.name, commissionRate: tenant.commissionRate ?? '' })
  }, [tenant, reset])

  if (isLoading || !tenant) return <p className="text-sm text-gray-500">{t('common.loading')}</p>

  async function onSaveInfo(values: InfoFormValues) {
    try {
      await updatePlatformTenant(id!, {
        name: values.name,
        commissionRate: values.commissionRate === '' ? null : Number(values.commissionRate),
      })
      toast.success(t('settings.saved'))
      void queryClient.invalidateQueries({ queryKey: ['platform-tenant', id] })
    } catch (error) {
      toast.error(extractErrorMessage(error, t('errors.generic')))
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: t('platformTenants.tabInfo') },
    { key: 'stats', label: t('platformTenants.tabStats') },
    { key: 'members', label: t('nav.staff') },
    { key: 'notes', label: t('platformTenants.tabNotes') },
    { key: 'history', label: t('platformTenants.tabHistory') },
  ]

  return (
    <div className="max-w-3xl">
      <Link to="/platform/tenants" className="mb-4 inline-block text-sm text-brand-700 hover:underline">
        ← {t('platformTenants.backToList')}
      </Link>
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">{tenant.name}</h1>
      <p className="mb-6 text-sm text-gray-500">{tenant.slug}</p>

      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              tab === tabItem.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <Card>
          <form onSubmit={(e) => void handleSubmit(onSaveInfo)(e)} className="flex flex-col gap-4">
            <Input label={t('platformTenants.storeName')} {...register('name')} error={errors.name?.message} />
            <Input
              label={t('platformTenants.commissionRate')}
              {...register('commissionRate')}
              error={errors.commissionRate?.message}
            />
            <p className="-mt-2 text-xs text-gray-500">{t('platformTenants.commissionRateHint')}</p>
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
              <div>
                <span className="block text-xs text-gray-500">{t('platformTenants.columnOwner')}</span>
                {tenant.owner.name} ({tenant.owner.email})
              </div>
              <div>
                <span className="block text-xs text-gray-500">{t('platformTenants.columnPlan')}</span>
                {tenant.subscriptions[0]?.plan.name ?? '—'}
              </div>
              <div>
                <span className="block text-xs text-gray-500">{t('platformTenants.columnCreated')}</span>
                {formatDate(tenant.createdAt)}
              </div>
            </div>
            <Button type="submit" loading={isSubmitting} className="w-fit">
              {t('common.save')}
            </Button>
          </form>
        </Card>
      )}

      {tab === 'stats' && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <p className="text-xs text-gray-500">{t('platformTenants.stats.products')}</p>
            <p className="text-2xl font-semibold text-gray-900">{tenant.stats.productCount}</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">{t('platformTenants.stats.orders')}</p>
            <p className="text-2xl font-semibold text-gray-900">{tenant.stats.orderCount}</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">{t('platformTenants.stats.members')}</p>
            <p className="text-2xl font-semibold text-gray-900">{tenant.stats.memberCount}</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">{t('platformTenants.stats.gmv')}</p>
            <p className="text-2xl font-semibold text-gray-900">${tenant.stats.gmv.toFixed(2)}</p>
          </Card>
        </div>
      )}

      {tab === 'members' && <TenantMembersTab tenantId={id!} />}
      {tab === 'notes' && <TenantNotesTab tenantId={id!} />}
      {tab === 'history' && <TenantHistoryTab tenantId={id!} />}
    </div>
  )
}

function TenantMembersTab({ tenantId }: { tenantId: string }) {
  const { data } = useQuery({
    queryKey: ['platform-tenant-members', tenantId],
    queryFn: () => listTenantMembers(tenantId, { page: 1, limit: 50 }),
  })

  return (
    <Card className="flex flex-col gap-3">
      {data?.items.map((member) => (
        <div key={member.id} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0">
          <div>
            <p className="text-sm font-medium text-gray-900">{member.user.name}</p>
            <p className="text-xs text-gray-500">{member.user.email}</p>
          </div>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{member.role}</span>
        </div>
      ))}
      {data?.items.length === 0 && <p className="text-sm text-gray-400">—</p>}
    </Card>
  )
}

function TenantNotesTab({ tenantId }: { tenantId: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const { data } = useQuery({
    queryKey: ['platform-tenant-notes', tenantId],
    queryFn: () => listTenantNotes(tenantId, { page: 1, limit: 50 }),
  })

  const mutation = useMutation({
    mutationFn: () => addTenantNote(tenantId, body),
    onSuccess: () => {
      setBody('')
      void queryClient.invalidateQueries({ queryKey: ['platform-tenant-notes', tenantId] })
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex gap-2">
        <textarea
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          rows={2}
          placeholder={t('platformTenants.notePlaceholder')}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button disabled={!body.trim()} loading={mutation.isPending} onClick={() => mutation.mutate()}>
          {t('platformTenants.addNote')}
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        {data?.items.map((note) => (
          <div key={note.id} className="border-b border-gray-100 pb-3 last:border-0">
            <p className="text-sm text-gray-800">{note.body}</p>
            <p className="mt-1 text-xs text-gray-400">
              {note.author.name} · {formatDate(note.createdAt)}
            </p>
          </div>
        ))}
        {data?.items.length === 0 && <p className="text-sm text-gray-400">{t('platformTenants.notesEmpty')}</p>}
      </div>
    </Card>
  )
}

function TenantHistoryTab({ tenantId }: { tenantId: string }) {
  const { t } = useTranslation()
  const { data } = useQuery({
    queryKey: ['platform-tenant-history', tenantId],
    queryFn: () => getTenantHistory(tenantId, { page: 1, limit: 50 }),
  })

  return (
    <Card className="flex flex-col gap-3">
      {data?.items.map((entry) => (
        <div key={entry.id} className="border-b border-gray-100 pb-3 last:border-0">
          <p className="text-sm font-medium text-gray-900">
            {t('platformTenants.historyEntry', {
              from: t(`platformTenants.status.${entry.fromStatus}`),
              to: t(`platformTenants.status.${entry.toStatus}`),
            })}
          </p>
          <p className="text-sm text-gray-600">{entry.reason}</p>
          <p className="mt-1 text-xs text-gray-400">
            {entry.changedBy.email} · {formatDate(entry.createdAt)}
          </p>
        </div>
      ))}
      {data?.items.length === 0 && <p className="text-sm text-gray-400">{t('platformTenants.historyEmpty')}</p>}
    </Card>
  )
}
