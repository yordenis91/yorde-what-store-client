/**
 * Storefront colour themes.
 *
 * Tailwind compiles every `brand-*` utility to `var(--color-brand-*)` and emits
 * the values on `:root`, so re-tinting a whole storefront is a matter of setting
 * those five custom properties on the document element — an inline style there
 * outranks the stylesheet.
 *
 * The tenant's `theme` column holds one of these keys (the backend defaults it
 * to `'default'`). Keeping it to a fixed set, rather than a free-form colour,
 * means an arbitrary string from the API can never reach a stylesheet.
 */

export interface ThemeShades {
  50: string
  100: string
  500: string
  600: string
  700: string
}

export const STOREFRONT_THEMES = {
  default: { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
  emerald: { 50: '#ecfdf5', 100: '#d1fae5', 500: '#10b981', 600: '#059669', 700: '#047857' },
  teal: { 50: '#f0fdfa', 100: '#ccfbf1', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e' },
  violet: { 50: '#f5f3ff', 100: '#ede9fe', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9' },
  rose: { 50: '#fff1f2', 100: '#ffe4e6', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c' },
  orange: { 50: '#fff7ed', 100: '#ffedd5', 500: '#f97316', 600: '#ea580c', 700: '#c2410c' },
  amber: { 50: '#fffbeb', 100: '#fef3c7', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
  slate: { 50: '#f8fafc', 100: '#f1f5f9', 500: '#64748b', 600: '#475569', 700: '#334155' },
} as const satisfies Record<string, ThemeShades>

export type ThemeName = keyof typeof STOREFRONT_THEMES

export const DEFAULT_THEME: ThemeName = 'default'
export const THEME_NAMES = Object.keys(STOREFRONT_THEMES) as ThemeName[]

const SHADE_KEYS = [50, 100, 500, 600, 700] as const

/** Falls back to the default palette for anything not in the set. */
export function resolveTheme(name: string | null | undefined): ThemeShades {
  return STOREFRONT_THEMES[name as ThemeName] ?? STOREFRONT_THEMES[DEFAULT_THEME]
}

/** Colour that represents a theme in the picker. */
export function themeSwatch(name: string): string {
  return resolveTheme(name)[600]
}

export function applyStorefrontTheme(name: string | null | undefined): void {
  const shades = resolveTheme(name)
  for (const shade of SHADE_KEYS) {
    document.documentElement.style.setProperty(`--color-brand-${shade}`, shades[shade])
  }
}

/**
 * Drops the overrides so the stylesheet's own values apply again — needed when
 * leaving a storefront for the platform in `/store/:slug` mode.
 */
export function clearStorefrontTheme(): void {
  for (const shade of SHADE_KEYS) {
    document.documentElement.style.removeProperty(`--color-brand-${shade}`)
  }
}
