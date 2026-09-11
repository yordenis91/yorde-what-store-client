import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  createLocation,
  createShipping,
  deleteLocation,
  deleteShipping,
  listLocations,
  listShippings,
} from '@/services/shipping.service'
import { extractErrorMessage } from '@/services/api-client'

export function ShippingPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'locations' | 'shipping'>('locations')

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('shipping.title')}</h1>
      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {(['locations', 'shipping'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === tabKey ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500'
            }`}
          >
            {tabKey === 'locations' ? t('shipping.tabLocations') : t('shipping.tabShipping')}
          </button>
        ))}
      </div>
      {tab === 'locations' ? <LocationsTab /> : <ShippingTab />}
    </div>
  )
}

function LocationsTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['locations'], queryFn: listLocations })
  const { register, handleSubmit, reset } = useForm<{ name: string }>()

  const createMutation = useMutation({
    mutationFn: (values: { name: string }) => createLocation(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['locations'] })
      reset()
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  const removeMutation = useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['locations'] }),
  })

  return (
    <div>
      <Card className="mb-4">
        <form onSubmit={(e) => void handleSubmit((v) => createMutation.mutate(v))(e)} className="flex gap-2">
          <Input placeholder={t('shipping.locationNamePlaceholder')} {...register('name', { required: true })} className="flex-1" />
          <Button type="submit" loading={createMutation.isPending}>
            {t('shipping.add')}
          </Button>
        </form>
      </Card>
      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {data?.map((loc) => (
            <div key={loc.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-gray-900">{loc.name}</span>
              <Button variant="danger" onClick={() => removeMutation.mutate(loc.id)}>
                {t('common.delete')}
              </Button>
            </div>
          ))}
          {data?.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-500">{t('shipping.noLocations')}</p>}
        </div>
      )}
    </div>
  )
}

interface ShippingFormValues {
  name: string
  cost: number
  locationId?: string
}

function ShippingTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: shippings, isLoading } = useQuery({ queryKey: ['shippings'], queryFn: listShippings })
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: listLocations })
  const { register, handleSubmit, reset } = useForm<ShippingFormValues>()

  const createMutation = useMutation({
    mutationFn: (values: ShippingFormValues) =>
      createShipping({ ...values, locationId: values.locationId || undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shippings'] })
      reset()
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  const removeMutation = useMutation({
    mutationFn: deleteShipping,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['shippings'] }),
  })

  return (
    <div>
      <Card className="mb-4">
        <form
          onSubmit={(e) => void handleSubmit((v) => createMutation.mutate(v))(e)}
          className="grid grid-cols-1 gap-2 sm:grid-cols-4"
        >
          <Input placeholder={t('shipping.methodNamePlaceholder')} {...register('name', { required: true })} />
          <Input
            placeholder={t('shipping.costPlaceholder')}
            type="number"
            step="0.01"
            {...register('cost', { required: true, valueAsNumber: true })}
          />
          <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" {...register('locationId')}>
            <option value="">{t('shipping.anyLocation')}</option>
            {locations?.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          <Button type="submit" loading={createMutation.isPending}>
            {t('shipping.add')}
          </Button>
        </form>
      </Card>
      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {shippings?.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{s.name}</p>
                <p className="text-xs text-gray-500">
                  ${s.cost} {s.location ? `— ${s.location.name}` : ''}
                </p>
              </div>
              <Button variant="danger" onClick={() => removeMutation.mutate(s.id)}>
                {t('common.delete')}
              </Button>
            </div>
          ))}
          {shippings?.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-500">{t('shipping.noMethods')}</p>}
        </div>
      )}
    </div>
  )
}
