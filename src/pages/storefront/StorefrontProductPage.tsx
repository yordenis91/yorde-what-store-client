import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getPublishedProduct } from '@/services/products.service'
import { useStorefrontTenant } from '@/hooks/useStorefrontTenant'
import { useCartStore } from '@/store/cart.store'
import { formatMoney } from '@/utils/format'
import { Button } from '@/components/ui/Button'

export function StorefrontProductPage() {
  const { slug = '', id = '' } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const tenant = useStorefrontTenant()
  const addItem = useCartStore((s) => s.addItem)
  const [variantId, setVariantId] = useState<string | undefined>()
  const [quantity, setQuantity] = useState(1)

  const { data: product, isLoading } = useQuery({
    queryKey: ['storefront-product', slug, id],
    queryFn: () => getPublishedProduct(slug, id),
  })

  if (isLoading || !product) return <p className="text-sm text-gray-500">{t('common.loading')}</p>

  const variant = product.variants.find((v) => v.id === variantId)
  const price = Number(variant?.price ?? product.price)
  const cover = product.images.find((i) => i.isCover) ?? product.images[0]

  function handleAddToCart() {
    addItem({
      productId: product!.id,
      variantId,
      name: product!.name,
      variantName: variant?.name,
      unitPrice: price,
      quantity,
      imageUrl: cover?.url,
    })
    toast.success(t('storefront.addToCart'))
    navigate(`/store/${slug}/cart`)
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
        {cover && <img src={cover.url} alt={product.name} className="h-full w-full object-cover" />}
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{product.name}</h1>
        <p className="mt-2 text-xl font-bold text-brand-700">
          {formatMoney(price, tenant.currencySymbol, tenant.currencySymbolPosition as 'pre' | 'post')}
        </p>
        {product.description && <p className="mt-4 text-sm text-gray-600">{product.description}</p>}

        {product.hasVariants && product.variants.length > 0 && (
          <div className="mt-4">
            <span className="mb-1 block text-sm font-medium text-gray-700">Options</span>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVariantId(v.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    variantId === v.id ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-300 text-gray-700'
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <Button
            onClick={handleAddToCart}
            disabled={product.hasVariants && product.variants.length > 0 && !variantId}
            className="flex-1"
          >
            {t('storefront.addToCart')}
          </Button>
        </div>
      </div>
    </div>
  )
}
