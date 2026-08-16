/** Trims copy to a length link previews and search results won't cut off. */
export function metaDescription(...candidates: (string | null | undefined)[]): string | undefined {
  const text = candidates.find((c) => c && c.trim().length > 0)?.trim()
  if (!text) return undefined
  const collapsed = text.replace(/\s+/g, ' ')
  return collapsed.length > 155 ? `${collapsed.slice(0, 152).trimEnd()}…` : collapsed
}
