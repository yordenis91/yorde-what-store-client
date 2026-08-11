import { useEffect } from 'react'
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
  createProduct,
  getProduct,
  listCategories,
  listTaxes,
  updateProduct,
} from '@/services/products.service'
import { extractErrorMessage } from '@/services/api-client'

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

export function ProductFormPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id && id !== 'new'
  const queryClient = useQueryClient()

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: listCategories })
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success(t('products.save'))
      navigate('/admin/products')
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('products.new')}</h1>
      <form onSubmit={(e) => void handleSubmit((values) => mutation.mutate(values))(e)} className="flex flex-col gap-4">
        <Input label={t('products.name')} {...register('name')} error={errors.name?.message} />
        <Input label="SKU" {...register('sku')} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea className="rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={3} {...register('description')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('products.price')} type="number" step="0.01" {...register('price')} error={errors.price?.message} />
          <Input label={t('products.stock')} type="number" {...register('quantity')} />
        </div>

        {!!categories?.length && (
          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">Categories</span>
            <div className="flex flex-wrap gap-3">
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-1 text-sm text-gray-700">
                  <input type="checkbox" value={c.id} {...register('categoryIds')} /> {c.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {!!taxes?.length && (
          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">Taxes</span>
            <div className="flex flex-wrap gap-3">
              {taxes.map((tx) => (
                <label key={tx.id} className="flex items-center gap-1 text-sm text-gray-700">
                  <input type="checkbox" value={tx.id} {...register('taxIds')} /> {tx.name} ({tx.rate}%)
                </label>
              ))}
            </div>
          </div>
        )}

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{t('products.variants')}</span>
            <Button
              type="button"
              variant="secondary"
              onClick={() => append({ name: '', sku: '', price: 0, quantity: 0 })}
            >
              {t('products.addVariant')}
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[2fr_1fr_1fr_auto] items-end gap-2">
                <Input placeholder="Name" {...register(`variants.${index}.name` as const)} />
                <Input placeholder="Price" type="number" step="0.01" {...register(`variants.${index}.price` as const)} />
                <Input placeholder="Qty" type="number" {...register(`variants.${index}.quantity` as const)} />
                <Button type="button" variant="danger" onClick={() => remove(index)}>
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
