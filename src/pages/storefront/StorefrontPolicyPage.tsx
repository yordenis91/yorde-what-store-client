import { useTranslation } from 'react-i18next'
import { useStorefront } from '@/hooks/useStorefront'
import { BackLink } from '@/components/storefront/BackLink'
import { Seo } from '@/components/storefront/Seo'
import type { PublicTenant } from '@/types/api'

export type PolicyKey = Extract<
  keyof PublicTenant,
  'termsOfSaleContent' | 'shippingPolicyContent' | 'returnPolicyContent' | 'privacyPolicyContent'
>

interface StorefrontPolicyPageProps {
  policyKey: PolicyKey
  titleKey: string
}

/**
 * Renders whichever policy the merchant has written for their own store
 * (terms of sale, shipping, returns, privacy) — plain text as authored, not
 * markdown. These are independent of Yorde What Store's own platform-level
 * Terms/Privacy pages, which cover the platform operator, not the merchant.
 */
export function StorefrontPolicyPage({ policyKey, titleKey }: StorefrontPolicyPageProps) {
  const { t } = useTranslation()
  const { tenant, path } = useStorefront()
  const content = tenant[policyKey]
  const title = t(titleKey)

  return (
    <div className="mx-auto max-w-2xl py-6">
      <Seo title={`${title} — ${tenant.name}`} noIndex />
      <BackLink fallbackTo={path()} label={t('storefront.continueShopping')} />
      <h1 className="mt-4 text-xl font-semibold text-gray-900">{title}</h1>
      {content ? (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{content}</p>
      ) : (
        <p className="mt-4 text-sm text-gray-500">{t('storefront.policyNotPublished', { store: tenant.name })}</p>
      )}
    </div>
  )
}
