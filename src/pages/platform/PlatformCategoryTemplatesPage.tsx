import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  createCategoryTemplate,
  deleteCategoryTemplate,
  listAllCategoryTemplates,
  updateCategoryTemplate,
  type CategoryTemplateInput,
} from '@/services/category-templates.service'
import { extractErrorMessage } from '@/services/api-client'
import { buildCategoryTree, type CategoryTreeNode } from '@/utils/category-tree'
import type { CategoryTemplate } from '@/types/api'

interface FormValues {
  name: string
  parentId: string
  sortOrder: number
}

export function PlatformCategoryTemplatesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: templates, isLoading } = useQuery({
    queryKey: ['platform-category-templates'],
    queryFn: listAllCategoryTemplates,
  })

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { name: '', parentId: '', sortOrder: 0 },
  })

  const tree = useMemo(() => buildCategoryTree(templates ?? []), [templates])

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: CategoryTemplateInput = {
        name: values.name,
        parentId: values.parentId || null,
        sortOrder: Number(values.sortOrder) || 0,
      }
      return editingId ? updateCategoryTemplate(editingId, payload) : createCategoryTemplate(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform-category-templates'] })
      reset({ name: '', parentId: '', sortOrder: 0 })
      setShowForm(false)
      setEditingId(null)
      toast.success(t('platformCategoryTemplates.saved'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategoryTemplate,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['platform-category-templates'] }),
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateCategoryTemplate(id, { isActive }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['platform-category-templates'] }),
  })

  function startCreate(parentId?: string) {
    setEditingId(null)
    reset({ name: '', parentId: parentId ?? '', sortOrder: 0 })
    setShowForm(true)
  }

  function startEdit(template: CategoryTemplate) {
    setEditingId(template.id)
    reset({ name: template.name, parentId: template.parentId ?? '', sortOrder: template.sortOrder })
    setShowForm(true)
  }

  function renderNode(node: CategoryTreeNode, depth: number) {
    return (
      <div key={node.id}>
        <div
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-gray-100 py-2 last:border-0"
          style={{ paddingLeft: Math.min(depth, 4) * 16 }}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className={`text-sm ${node.isActive ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{node.name}</span>
            <span className="text-xs text-gray-400">{node.slug}</span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <button type="button" className="text-xs font-medium text-brand-700" onClick={() => startCreate(node.id)}>
              + {t('platformCategoryTemplates.subcategory')}
            </button>
            <button type="button" className="text-xs font-medium text-gray-500" onClick={() => startEdit(node)}>
              {t('common.edit')}
            </button>
            <button
              type="button"
              className="text-xs font-medium text-gray-500"
              onClick={() => toggleActiveMutation.mutate({ id: node.id, isActive: !node.isActive })}
            >
              {node.isActive ? t('platformCategoryTemplates.deactivate') : t('platformCategoryTemplates.activate')}
            </button>
            <button type="button" className="text-xs font-medium text-red-600" onClick={() => deleteMutation.mutate(node.id)}>
              {t('common.delete')}
            </button>
          </div>
        </div>
        {node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('platformCategoryTemplates.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('platformCategoryTemplates.subtitle')}</p>
        </div>
        <Button onClick={() => (showForm ? setShowForm(false) : startCreate())}>
          {showForm ? t('common.cancel') : t('platformCategoryTemplates.newCategory')}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <form
            onSubmit={(e) => void handleSubmit((values) => saveMutation.mutate(values))(e)}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <Input
              placeholder={t('platformCategoryTemplates.namePlaceholder')}
              className="sm:col-span-2"
              {...register('name', { required: true })}
            />
            <Input
              placeholder={t('platformCategoryTemplates.sortOrderPlaceholder')}
              type="number"
              {...register('sortOrder', { valueAsNumber: true })}
            />
            <select
              aria-label={t('platformCategoryTemplates.parentLabel')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-3"
              {...register('parentId')}
            >
              <option value="">{t('platformCategoryTemplates.noParent')}</option>
              {templates?.map((template) => (
                <option key={template.id} value={template.id} disabled={template.id === editingId}>
                  {template.name}
                </option>
              ))}
            </select>
            <Button type="submit" loading={saveMutation.isPending} className="w-fit sm:col-span-3">
              {t('platformCategoryTemplates.save')}
            </Button>
          </form>
        </Card>
      )}

      <Card>
        {isLoading ? (
          <p className="text-sm text-gray-500">{t('common.loading')}</p>
        ) : tree.length === 0 ? (
          <p className="text-sm text-gray-500">{t('platformCategoryTemplates.empty')}</p>
        ) : (
          <div className="flex flex-col">{tree.map((node) => renderNode(node, 0))}</div>
        )}
      </Card>
    </div>
  )
}
