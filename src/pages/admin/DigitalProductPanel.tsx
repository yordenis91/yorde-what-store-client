import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { extractErrorMessage } from '@/services/api-client'
import {
  addPriceSchedule,
  deleteDigitalAsset,
  deletePriceSchedule,
  listDigitalAssets,
  listPriceSchedule,
  uploadDigitalAsset,
} from '@/services/digital.service'
import { useIsOwner } from '@/hooks/useIsOwner'
import { formatMoney } from '@/utils/format'

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

/**
 * The files a buyer receives once paid, and the price changes planned ahead. They live in private
 * storage: nothing here ever shows or links the stored file, a buyer only reaches it through the
 * expiring links the delivery email carries.
 */
export function DigitalProductPanel({
  productId,
  currencySymbol,
  currencySymbolPosition,
}: {
  productId: string
  currencySymbol: string
  currencySymbolPosition: 'pre' | 'post'
}) {
  return (
    <>
      <FilesCard productId={productId} />
      <PriceScheduleCard productId={productId} symbol={currencySymbol} position={currencySymbolPosition} />
    </>
  )
}

function FilesCard({ productId }: { productId: string }) {
  const { t } = useTranslation()
  const isOwner = useIsOwner()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [label, setLabel] = useState('')
  const key = ['digital-assets', productId]

  const { data: assets } = useQuery({ queryKey: key, queryFn: () => listDigitalAssets(productId) })

  const upload = useMutation({
    mutationFn: (file: File) => uploadDigitalAsset(productId, file, label.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key })
      setLabel('')
      toast.success(t('digital.fileUploaded'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })
  const remove = useMutation({
    mutationFn: (assetId: string) => deleteDigitalAsset(productId, assetId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  return (
    <Card className="mb-4">
      <span className="mb-1 block text-sm font-medium text-gray-700">{t('digital.files')}</span>
      <p className="mb-3 text-xs text-gray-500">{t('digital.filesHint')}</p>

      {assets && assets.length === 0 && <p className="mb-3 text-sm text-amber-700">{t('digital.noFiles')}</p>}
      <ul className="mb-3 flex flex-col divide-y divide-gray-100">
        {assets?.map((asset) => (
          <li key={asset.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium text-gray-900">{asset.label}</span>
              <span className="block truncate text-xs text-gray-500">
                {asset.fileName} · {formatSize(asset.sizeBytes)}
              </span>
            </span>
            {isOwner && (
              <Button
                type="button"
                variant="ghost"
                disabled={remove.isPending}
                onClick={() => {
                  if (confirm(t('digital.removeFileConfirm'))) remove.mutate(asset.id)
                }}
              >
                {t('common.delete')}
              </Button>
            )}
          </li>
        ))}
      </ul>

      {isOwner && (
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-3 sm:flex-row sm:items-end">
          <Input
            label={t('digital.fileLabel')}
            placeholder={t('digital.fileLabelPlaceholder')}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="sm:flex-1"
          />
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.epub,.zip,application/pdf,application/epub+zip,application/zip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) upload.mutate(file)
            }}
          />
          <Button
            type="button"
            variant="secondary"
            loading={upload.isPending}
            disabled={label.trim().length === 0}
            onClick={() => inputRef.current?.click()}
          >
            {t('digital.uploadFile')}
          </Button>
        </div>
      )}
    </Card>
  )
}

function PriceScheduleCard({ productId, symbol, position }: { productId: string; symbol: string; position: 'pre' | 'post' }) {
  const { t } = useTranslation()
  const isOwner = useIsOwner()
  const queryClient = useQueryClient()
  const [price, setPrice] = useState('')
  const [when, setWhen] = useState('')
  const key = ['price-schedule', productId]
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const { data: entries } = useQuery({ queryKey: key, queryFn: () => listPriceSchedule(productId) })

  const add = useMutation({
    // A datetime-local value has no zone; it is read in this browser's, which the form states.
    mutationFn: () => addPriceSchedule(productId, { price: Number(price), effectiveFrom: new Date(when).toISOString() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key })
      setPrice('')
      setWhen('')
      toast.success(t('digital.scheduleAdded'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })
  const remove = useMutation({
    mutationFn: (id: string) => deletePriceSchedule(productId, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  const valid = Number(price) > 0 && when !== '' && !Number.isNaN(new Date(when).getTime())

  return (
    <Card className="mb-4">
      <span className="mb-1 block text-sm font-medium text-gray-700">{t('digital.priceSchedule')}</span>
      <p className="mb-3 text-xs text-gray-500">{t('digital.priceScheduleHint')}</p>

      {entries && entries.length > 0 && (
        <ul className="mb-3 flex flex-col divide-y divide-gray-100">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>
                <span className="font-medium text-gray-900">{formatMoney(Number(entry.price), symbol, position)}</span>
                <span className="ml-2 text-gray-600">{new Date(entry.effectiveFrom).toLocaleString()}</span>
                <span className="ml-2 text-xs text-gray-500">
                  {entry.appliedAt ? t('digital.scheduleApplied') : t('digital.schedulePending')}
                </span>
              </span>
              {isOwner && !entry.appliedAt && (
                <Button type="button" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate(entry.id)}>
                  {t('common.delete')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isOwner && (
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label={t('digital.newPrice')}
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <Input
              label={t('digital.effectiveFrom')}
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>
          <p className="text-xs text-gray-500">
            {valid
              ? t('digital.schedulePreview', { date: new Date(when).toLocaleString(), zone })
              : t('digital.scheduleZone', { zone })}
          </p>
          <Button type="button" variant="secondary" className="w-fit" loading={add.isPending} disabled={!valid} onClick={() => add.mutate()}>
            {t('digital.addSchedule')}
          </Button>
        </div>
      )}
    </Card>
  )
}
