import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'

export function StorefrontOrderConfirmedPage() {
  const { slug = '', id } = useParams()
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600">
        ✓
      </div>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">{t('storefront.orderConfirmed')}</h1>
      <p className="mb-6 text-sm text-gray-500">Order ID: {id}</p>
      <Link to={`/store/${slug}`}>
        <Button variant="secondary">{t('storefront.continueShopping')}</Button>
      </Link>
    </div>
  )
}
