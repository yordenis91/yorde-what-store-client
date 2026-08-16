import { describe, expect, it } from 'vitest'
import { metaDescription } from './seo'

describe('metaDescription', () => {
  it('uses the first candidate that has content', () => {
    expect(metaDescription('About us', 'Tagline')).toBe('About us')
  })

  it('falls through empty, blank, null and undefined candidates', () => {
    expect(metaDescription(null, '', '   ', undefined, 'Tagline')).toBe('Tagline')
  })

  it('returns undefined when nothing usable is given, so no empty tag is emitted', () => {
    expect(metaDescription(null, undefined, '', '  ')).toBeUndefined()
  })

  it('collapses newlines, which would otherwise break the meta tag', () => {
    expect(metaDescription('Cold pressed.\n\nNo sulfates.')).toBe('Cold pressed. No sulfates.')
  })

  it('trims surrounding whitespace', () => {
    expect(metaDescription('  Handmade  ')).toBe('Handmade')
  })

  it('truncates long copy to a length search results and previews will show', () => {
    const long = 'a'.repeat(300)

    const result = metaDescription(long)!

    expect(result.length).toBeLessThanOrEqual(155)
    expect(result.endsWith('…')).toBe(true)
  })

  it('leaves copy that already fits untouched', () => {
    const fits = 'a'.repeat(155)

    expect(metaDescription(fits)).toBe(fits)
  })
})
