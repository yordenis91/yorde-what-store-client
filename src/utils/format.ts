export function formatMoney(value: string | number, symbol = '$', position: 'pre' | 'post' = 'pre'): string {
  const num = typeof value === 'string' ? Number(value) : value
  const formatted = num.toFixed(2)
  return position === 'pre' ? `${symbol}${formatted}` : `${formatted}${symbol}`
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const DIACRITICS_RANGE = new RegExp('[\\u0300-\\u036f]', 'g')

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS_RANGE, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
