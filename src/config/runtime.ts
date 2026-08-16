/**
 * Reads a value written into `window.__APP_CONFIG__` by docker-entrypoint.sh at
 * container start. Values still wrapped in double underscores are the
 * placeholders shipped in public/config.js — nothing substituted them, so the
 * caller should fall back to its build-time source.
 */
export function runtimeValue(key: 'apiUrl' | 'storefrontRootDomain'): string | null {
  const value = window.__APP_CONFIG__?.[key]
  if (!value || /^__.*__$/.test(value)) return null
  return value
}
