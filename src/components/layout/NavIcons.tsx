import type { ReactNode } from 'react'

/**
 * Minimal line icons for the admin sidebars (tenant admin and platform/super
 * admin) — hand-rolled inline SVGs (matching the hamburger/bell icons already
 * in this layout) rather than an icon library dependency, since it's just a
 * handful of nav items. Each one inherits its color from the NavLink's text
 * color via `currentColor`, so it switches with the active/inactive state for
 * free.
 */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0">
      {children}
    </svg>
  )
}

export function DashboardIcon() {
  return (
    <Icon>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
    </Icon>
  )
}

export function ProductsIcon() {
  return (
    <Icon>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 9.5l8.25-4.5 8.25 4.5-8.25 4.5-8.25-4.5zM3.75 9.5v5.5l8.25 4.5m0-10v10m8.25-10v5.5l-8.25 4.5"
      />
    </Icon>
  )
}

export function OrdersIcon() {
  return (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 8a5.5 5.5 0 0111 0" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 8h16l-1.2 11.1a2 2 0 01-2 1.9H7.2a2 2 0 01-2-1.9L4 8z"
      />
    </Icon>
  )
}

export function CouponsIcon() {
  return (
    <Icon>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.2 3.5H5.5a2 2 0 00-2 2v5.7c0 .53.21 1.04.59 1.41l7.8 7.8a2 2 0 002.82 0l5.7-5.7a2 2 0 000-2.82l-7.8-7.8a2 2 0 00-1.41-.59z"
      />
      <circle cx="8" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function ShippingIcon() {
  return (
    <Icon>
      <rect x="3" y="7" width="11" height="9" rx="1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h3.5l3 3v3H14v-6z" />
      <circle cx="7" cy="18.5" r="1.5" />
      <circle cx="17" cy="18.5" r="1.5" />
    </Icon>
  )
}

export function CustomersIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8" r="3.2" />
      <path strokeLinecap="round" d="M5 20a7 7 0 0114 0" />
    </Icon>
  )
}

export function StaffIcon() {
  return (
    <Icon>
      <circle cx="9" cy="8" r="2.6" />
      <path strokeLinecap="round" d="M3.5 19a5.5 5.5 0 0111 0" />
      <circle cx="17" cy="9" r="2" />
      <path strokeLinecap="round" d="M15 19a4.4 4.4 0 017.5-3.1" />
    </Icon>
  )
}

export function EmailTemplatesIcon() {
  return (
    <Icon>
      <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7l8 6 8-6" />
    </Icon>
  )
}

export function PlansIcon() {
  return (
    <Icon>
      <rect x="3" y="5.5" width="18" height="13" rx="1.8" />
      <path strokeLinecap="round" d="M3 9.5h18" />
      <path strokeLinecap="round" d="M6.5 14.5h4" />
    </Icon>
  )
}

export function SettingsIcon() {
  return (
    <Icon>
      <path strokeLinecap="round" d="M4 6h9M17 6h3M4 12h5M13 12h7M4 18h11M19 18h1" />
      <circle cx="12.5" cy="6" r="1.8" fill="white" />
      <circle cx="8.5" cy="12" r="1.8" fill="white" />
      <circle cx="15.5" cy="18" r="1.8" fill="white" />
    </Icon>
  )
}

export function TenantsIcon() {
  return (
    <Icon>
      <rect x="3.5" y="9" width="7" height="11" rx="1" />
      <rect x="12.5" y="4" width="8" height="16" rx="1" />
      <path strokeLinecap="round" d="M6 12.5h1M6 15.5h1M6 18h1M15.5 7.5h1M15.5 10.5h1M15.5 13.5h1M15.5 16.5h1" />
    </Icon>
  )
}

export function CategoryCatalogIcon() {
  return (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h4M4 12h4M4 18h4M10 6h10M10 12h7M10 18h10" />
    </Icon>
  )
}

export function UpgradeRequestsIcon() {
  return (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-5 5m5-5l5 5" />
    </Icon>
  )
}

export function GlobalProductsIcon() {
  return (
    <Icon>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 9.5l8.25-4.5 8.25 4.5-8.25 4.5-8.25-4.5zM3.75 9.5v5.5l8.25 4.5m0-10v10m8.25-10v5.5l-8.25 4.5"
      />
      <circle cx="19" cy="6" r="3" fill="white" stroke="currentColor" />
      <path strokeLinecap="round" d="M17.6 6h2.8M19 4.6v2.8" />
    </Icon>
  )
}

export function AuditLogIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2" />
    </Icon>
  )
}

export function BackupsIcon() {
  return (
    <Icon>
      <ellipse cx="12" cy="6" rx="7" ry="2.5" />
      <path strokeLinecap="round" d="M5 6v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6" />
      <path strokeLinecap="round" d="M5 12v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
    </Icon>
  )
}
