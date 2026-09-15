import { useEffect, useMemo, useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import {
  addProductImage,
  createCategory,
  createCategoryFromTemplate,
  createProduct,
  createTax,
  getProduct,
  listCategories,
  listCategoryTemplates,
  listTaxes,
  removeProductImage,
  setCoverImage,
  updateProduct,
} from '@/services/products.service'
import { uploadImage } from '@/services/uploads.service'
import { resolveMediaUrl } from '@/services/api-client'
import { extractErrorMessage } from '@/services/api-client'
import { flattenCategoryTree } from '@/utils/category-tree'
import type { CategoryTemplate } from '@/types/api'

const variantSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  price: z.coerce.number().min(0),
  quantity: z.coerce.number().min(0).optional(),
})

const schema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  quantity: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
  categoryIds: z.array(z.string()).optional(),
  taxIds: z.array(z.string()).optional(),
  variants: z.array(variantSchema).optional(),
})
type FormValues = z.infer<typeof schema>

/** "Celulares" -> "Electrónica / Celulares", so a flat <select> still shows a template's place in the catalog. */
function templateLabels(templates: CategoryTemplate[]): Map<string, string> {
  const byId = new Map(templates.map((t) => [t.id, t]))
  const labels = new Map<string, string>()
  function labelFor(t: CategoryTemplate): string {
    const cached = labels.get(t.id)
    if (cached) return cached
    const parent = t.parentId ? byId.get(t.parentId) : undefined
    const label = parent ? `${labelFor(parent)} / ${t.name}` : t.name
    labels.set(t.id, label)
    return label
  }
  templates.forEach(labelFor)
  return labels
}

function cartesian(groups: string[][]): string[] {
  return groups.reduce<string[]>(
    (acc, group) => acc.flatMap((prefix) => group.map((value) => (prefix ? `${prefix} / ${value}` : value))),
    [''],
  )
}

export function ProductFormPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id && id !== 'new'
  const queryClient = useQueryClient()

  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewTax, setShowNewTax] = useState(false)
  const [newTaxName, setNewTaxName] = useState('')
  const [newTaxRate, setNewTaxRate] = useState('')
  const [attr1, setAttr1] = useState('')
  const [attr2, setAttr2] = useState('')
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // In case the upload is still in flight when this page unmounts (e.g. the
  // user navigates away) — otherwise the object URL never gets released.
  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    }
  }, [pendingPreview])

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const { data: categoryTemplates } = useQuery({ queryKey: ['category-templates'], queryFn: listCategoryTemplates })
  const { data: taxes } = useQuery({ queryKey: ['taxes'], queryFn: listTaxes })
  const { data: existing } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id!),
    enabled: isEdit,
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true, variants: [], categoryIds: [], taxIds: [] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'variants' })

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        sku: existing.sku ?? '',
        description: existing.description ?? '',
        price: Number(existing.price),
        quantity: existing.quantity,
        isActive: existing.isActive,
        categoryIds: existing.categories.map((c) => c.category.id),
        taxIds: existing.taxes.map((tx) => tx.tax.id),
        variants: existing.variants.map((v) => ({
          name: v.name,
          sku: v.sku ?? '',
          price: Number(v.price),
          quantity: v.quantity,
        })),
      })
    }
  }, [existing, reset])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => (isEdit ? updateProduct(id!, values) : createProduct(values)),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success(t('products.save'))
      if (isEdit) {
        void queryClient.invalidateQueries({ queryKey: ['product', id] })
      } else {
        navigate(`/admin/products/${saved.id}`)
      }
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  const createCategoryMutation = useMutation({
    mutationFn: () => createCategory(newCategoryName),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      setNewCategoryName('')
      setShowNewCategory(false)
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  const createCategoryFromTemplateMutation = useMutation({
    mutationFn: (templateId: string) => createCategoryFromTemplate(templateId),
    onSuccess: (category) => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      const current = getValues('categoryIds') ?? []
      if (!current.includes(category.id)) setValue('categoryIds', [...current, category.id])
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  const createTaxMutation = useMutation({
    mutationFn: () => createTax(newTaxName, Number(newTaxRate)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['taxes'] })
      setNewTaxName('')
      setNewTaxRate('')
      setShowNewTax(false)
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const url = await uploadImage(file)
      const hasNoCover = !existing?.images.some((i) => i.isCover)
      return addProductImage(id!, url, hasNoCover)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['product', id] }),
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
    onSettled: () => {
      setPendingPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    },
  })

  const removeImageMutation = useMutation({
    mutationFn: (imageId: string) => removeProductImage(id!, imageId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['product', id] }),
  })

  const setCoverMutation = useMutation({
    mutationFn: (imageId: string) => setCoverImage(id!, imageId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['product', id] }),
  })

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingPreview(URL.createObjectURL(file))
    uploadMutation.mutate(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function generateVariants() {
    const group1 = attr1.split(',').map((s) => s.trim()).filter(Boolean)
    const group2 = attr2.split(',').map((s) => s.trim()).filter(Boolean)
    const groups = [group1, group2].filter((g) => g.length > 0)
    if (groups.length === 0) return
    const basePrice = Number(watch('price')) || 0
    for (const name of cartesian(groups)) {
      append({ name, sku: '', price: basePrice, quantity: 0 })
    }
    setAttr1('')
    setAttr2('')
  }

  const templateLabelById = useMemo(() => templateLabels(categoryTemplates ?? []), [categoryTemplates])
  const pickedTemplateIds = useMemo(
    () => new Set((categories ?? []).map((c) => c.templateId).filter((id): id is string => !!id)),
    [categories],
  )
  // Depth-first order (a parent immediately followed by its own children),
  // not a plain sortOrder/name sort on the raw rows — every category's
  // sortOrder restarts at 0 within its own parent, so a flat sort interleaves
  // unrelated parents and children whenever those values happen to overlap.
  const orderedTemplates = useMemo(() => flattenCategoryTree(categoryTemplates ?? []), [categoryTemplates])
  const availableTemplates = orderedTemplates.filter((t) => !pickedTemplateIds.has(t.id))

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{isEdit ? t('products.edit') : t('products.new')}</h1>

      {isEdit && (
        <Card className="mb-4">
          <span className="mb-3 block text-sm font-medium text-gray-700">{t('products.images')}</span>
          <div className="flex flex-wrap gap-3">
            {existing?.images.map((img) => (
              <div key={img.id} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-gray-200">
                <img src={resolveMediaUrl(img.url)} alt="" className="h-full w-full object-cover" />
                {img.isCover && (
                  <span className="absolute left-1 top-1 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] text-white">
                    {t('products.cover')}
                  </span>
                )}
                <div className="absolute inset-0 hidden items-center justify-center gap-1 bg-black/50 group-hover:flex">
                  {!img.isCover && (
                    <button
                      type="button"
                      onClick={() => setCoverMutation.mutate(img.id)}
                      className="rounded bg-white px-1.5 py-0.5 text-[10px]"
                    >
                      {t('products.setCover')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImageMutation.mutate(img.id)}
                    className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] text-white"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            {pendingPreview ? (
              <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-gray-200">
                <img src={pendingPreview} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-24 w-24 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-xs text-gray-500 hover:border-brand-500 hover:text-brand-600"
              >
                {t('products.upload')}
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
          </div>
        </Card>
      )}

      <form onSubmit={(e) => void handleSubmit((values) => mutation.mutate(values))(e)} className="flex flex-col gap-4">
        <Input label={t('products.name')} {...register('name')} error={errors.name?.message} />
        <Input label={t('products.sku')} {...register('sku')} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">{t('products.description')}</label>
          <textarea className="rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={3} {...register('description')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('products.price')} type="number" step="0.01" {...register('price')} error={errors.price?.message} />
          <Input label={t('products.stock')} type="number" {...register('quantity')} />
        </div>

        <div>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <span className="block text-sm font-medium text-gray-700">{t('products.categories')}</span>
            <div className="flex max-w-full flex-wrap items-center gap-2">
              {availableTemplates.length > 0 && (
                <select
                  className="max-w-full min-w-0 rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-700"
                  value=""
                  disabled={createCategoryFromTemplateMutation.isPending}
                  onChange={(e) => {
                    if (e.target.value) createCategoryFromTemplateMutation.mutate(e.target.value)
                  }}
                >
                  <option value="">{t('products.fromCatalog')}</option>
                  {availableTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {templateLabelById.get(template.id) ?? template.name}
                    </option>
                  ))}
                </select>
              )}
              <button type="button" className="text-xs font-medium text-brand-700" onClick={() => setShowNewCategory((v) => !v)}>
                {t('products.addCategory')}
              </button>
            </div>
          </div>
          {showNewCategory && (
            <div className="mb-2 flex gap-2">
              <Input
                placeholder={t('products.categoryNamePlaceholder')}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={!newCategoryName || createCategoryMutation.isPending}
                onClick={() => createCategoryMutation.mutate()}
              >
                {t('products.add')}
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            {categories?.map((c) => (
              <label key={c.id} className="flex items-center gap-1 text-sm text-gray-700">
                <input type="checkbox" value={c.id} {...register('categoryIds')} /> {c.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="block text-sm font-medium text-gray-700">{t('products.taxes')}</span>
            <button type="button" className="text-xs font-medium text-brand-700" onClick={() => setShowNewTax((v) => !v)}>
              {t('products.addTax')}
            </button>
          </div>
          {showNewTax && (
            <div className="mb-2 flex gap-2">
              <Input
                placeholder={t('products.taxNamePlaceholder')}
                value={newTaxName}
                onChange={(e) => setNewTaxName(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder={t('products.taxRatePlaceholder')}
                type="number"
                value={newTaxRate}
                onChange={(e) => setNewTaxRate(e.target.value)}
                className="w-24"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={!newTaxName || !newTaxRate || createTaxMutation.isPending}
                onClick={() => createTaxMutation.mutate()}
              >
                {t('products.add')}
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            {taxes?.map((tx) => (
              <label key={tx.id} className="flex items-center gap-1 text-sm text-gray-700">
                <input type="checkbox" value={tx.id} {...register('taxIds')} /> {tx.name} ({tx.rate}%)
              </label>
            ))}
          </div>
        </div>

        <Card>
          <span className="mb-2 block text-sm font-medium text-gray-700">{t('products.variants')}</span>
          <p className="mb-2 text-xs text-gray-500">{t('products.variantsHint')}</p>
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input placeholder={t('products.variantAttr1Placeholder')} value={attr1} onChange={(e) => setAttr1(e.target.value)} />
            <Input placeholder={t('products.variantAttr2Placeholder')} value={attr2} onChange={(e) => setAttr2(e.target.value)} />
            <Button type="button" variant="secondary" onClick={generateVariants}>
              {t('products.generate')}
            </Button>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">{t('products.rows')}</span>
            <Button type="button" variant="ghost" onClick={() => append({ name: '', sku: '', price: 0, quantity: 0 })}>
              {t('products.addVariant')}
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]"
              >
                <Input
                  placeholder={t('products.name')}
                  className="col-span-2 sm:col-auto"
                  {...register(`variants.${index}.name` as const)}
                />
                <Input
                  placeholder={t('products.price')}
                  type="number"
                  step="0.01"
                  {...register(`variants.${index}.price` as const)}
                />
                <Input placeholder={t('products.qty')} type="number" {...register(`variants.${index}.quantity` as const)} />
                <Button type="button" variant="danger" className="col-span-2 sm:col-auto" onClick={() => remove(index)}>
                  ×
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" loading={isSubmitting}>
            {t('products.save')}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/admin/products')}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}
