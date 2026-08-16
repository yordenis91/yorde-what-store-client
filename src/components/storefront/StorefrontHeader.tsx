import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { resolveMediaUrl } from '@/services/api-client'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { CartIcon } from '@/components/ui/icons'
import { SOCIAL_NETWORKS } from '@/config/social'
import type { PublicTenant } from '@/types/api'

interface StorefrontHeaderProps {
  tenant: PublicTenant
  cartCount: number
  homePath: string
  cartPath: string
  /** The hero belongs on the store's front page, not on cart or checkout. */
  showHero?: boolean
}

function SocialLinks({ links, className = '' }: { links: Record<string, string>; className?: string }) {
  const present = SOCIAL_NETWORKS.filter((network) => links[network.key])
  if (present.length === 0) return null

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {present.map(({ key, label, Icon }) => (
        <a
          key={key}
          href={links[key]}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={label}
          title={label}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-white/25"
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  )
}

export function StorefrontHeader({ tenant, cartCount, homePath, cartPath, showHero }: StorefrontHeaderProps) {
  const { t } = useTranslation()
  const logo = tenant.logoUrl ? resolveMediaUrl(tenant.logoUrl) : null
  const banner = tenant.bannerUrl ? resolveMediaUrl(tenant.bannerUrl) : null

  return (
    <header>
      <div className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to={homePath} className="flex min-w-0 items-center gap-2.5">
            {logo ? (
              <img src={logo} alt={tenant.name} className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-black/5" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                {tenant.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate text-base font-semibold tracking-tight text-gray-900">{tenant.name}</span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher />
            <Link
              to={cartPath}
              aria-label={t('nav.cart')}
              className="relative flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              <CartIcon className="h-4.5 w-4.5" />
              <span className="hidden sm:inline">{t('nav.cart')}</span>
              {cartCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold tabular-nums text-brand-700">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {showHero && (
        <div className="relative isolate overflow-hidden bg-brand-700">
          {banner ? (
            <>
              <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-gray-950/80 via-gray-950/55 to-gray-950/25" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700" />
              {/* Soft highlight so the flat fallback doesn't read as a solid block. */}
              <div className="absolute -left-24 -top-32 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
              <div className="absolute -bottom-32 right-0 h-72 w-72 rounded-full bg-black/15 blur-3xl" />
            </>
          )}

          <div className="relative mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:py-14">
            <div className="flex items-center gap-4">
              {logo && (
                <img
                  src={logo}
                  alt={tenant.name}
                  className="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-lg ring-2 ring-white/30 sm:h-20 sm:w-20"
                />
              )}
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight text-white sm:text-4xl">{tenant.name}</h1>
                {tenant.tagline && <p className="mt-1 text-sm text-white/85 sm:text-base">{tenant.tagline}</p>}
              </div>
            </div>

            {tenant.about && <p className="max-w-2xl text-sm leading-relaxed text-white/75">{tenant.about}</p>}

            <SocialLinks links={tenant.socialLinks} />
          </div>
        </div>
      )}
    </header>
  )
}
