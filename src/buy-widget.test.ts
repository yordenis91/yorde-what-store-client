import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve(__dirname, '../public/buy-widget.js'), 'utf8')

function run(html: string) {
  document.body.innerHTML = html
  // The widget reads its own origin from document.currentScript.
  const tag = document.createElement('script')
  tag.src = 'https://yws.example.com/buy-widget.js'
  Object.defineProperty(document, 'currentScript', { value: tag, configurable: true })
  new Function(source)()
}

const flush = () => new Promise((r) => setTimeout(r, 0))

const markup = `
  <a data-yws-buy data-store="lola" data-product="p1">Buy</a>
  <span data-yws-price data-store="lola" data-product="p1">$9.99</span>
  <s data-yws-compare data-store="lola" data-product="p1"></s>`

function mockApi(price: string, compareAtPrice: string | null = null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () => ({
        data: url.includes('/tenants/storefront/')
          ? { currency: 'USD', currencySymbol: '$', locale: 'es' }
          : { price, compareAtPrice },
      }),
    })),
  )
}

describe('buy widget', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('points the button at the direct-buy route on the script origin, before any lookup', () => {
    mockApi('9.99')
    run(markup)
    expect(document.querySelector('a')!.getAttribute('href')).toBe('https://yws.example.com/store/lola/buy/p1')
  })

  it('writes the current price, so a scheduled change shows without editing the page', async () => {
    mockApi('12.99')
    run(markup)
    await flush()
    expect(document.querySelector('[data-yws-price]')!.textContent).toMatch(/12,99|12\.99/)
    expect(fetch).toHaveBeenCalledWith('https://yws.example.com/api/v1/storefront/products/p1', {
      headers: { 'X-Tenant-ID': 'lola' },
    })
  })

  it('shows the before price only when it is higher', async () => {
    mockApi('9.99', '14.99')
    run(markup)
    await flush()
    expect(document.querySelector('[data-yws-compare]')!.textContent).toMatch(/14,99|14\.99/)
  })

  it('keeps the fallback text and a working button when the lookup fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })))
    run(markup)
    await flush()
    expect(document.querySelector('[data-yws-price]')!.textContent).toBe('$9.99')
    expect(document.querySelector('a')!.getAttribute('href')).toContain('/buy/p1')
  })
})
