import { chromium } from 'playwright'
import { randomBytes } from 'node:crypto'

const SHOT_DIR = '/tmp/claude-1000/-var-www-html-yorde-what-store/7e222cbc-db36-41f8-b454-5048bc0e48d2/scratchpad'
const errors = []
const rid = randomBytes(3).toString('hex')
const email = `owner-${rid}@test.com`
const storeName = `Test Store ${rid}`

const browser = await chromium.launch({ args: ['--no-sandbox'] })
const context = await browser.newContext()
const page = await context.newPage()
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`)
})
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))
page.on('requestfailed', (req) => {
  if (req.url().includes('/auth/refresh')) return // expected 401 on very first bootstrap, harmless
  errors.push(`[requestfailed] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`)
})

async function shot(name) {
  await page.screenshot({ path: `${SHOT_DIR}/${name}.png`, fullPage: true })
  console.log(`SCREENSHOT ${name}`)
}

try {
  console.log('STEP: goto landing (hard nav, expected)')
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })

  console.log('STEP: click Crear tienda / register link')
  await page.click('text=/Crear tienda|Create store/')
  await page.waitForSelector('input[name="name"]')

  await page.fill('input[name="name"]', 'Test Owner')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', 'SuperSecret123')
  await page.fill('input[name="storeName"]', storeName)
  await shot('02-register-filled')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/admin', { timeout: 15000 })
  await page.waitForSelector('text=/Dashboard|Panel/', { timeout: 15000 })
  await shot('03-admin-dashboard')
  console.log('STEP: register+redirect OK, url=', page.url())

  console.log('STEP: click Products nav link, then New product')
  await page.click('a:has-text("Products"), a:has-text("Productos")')
  await page.waitForURL('**/admin/products')
  await page.click('a:has-text("New product"), a:has-text("Nuevo producto")')
  await page.waitForSelector('input[name="name"]', { timeout: 15000 })
  await page.fill('input[name="name"]', 'Camiseta Playwright')
  await page.fill('input[name="price"]', '25')
  await page.fill('input[name="quantity"]', '50')
  await shot('04-product-form-filled')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/admin/products', { timeout: 15000 })
  await page.waitForSelector('text=Camiseta Playwright', { timeout: 15000 })
  await shot('05-products-list')
  console.log('STEP: product created OK')

  console.log('STEP: click Store settings, enable whatsapp')
  await page.click('a:has-text("Store settings"), a:has-text("Configuración de tienda")')
  await page.waitForSelector('input[name="name"]', { timeout: 15000 })
  const waCheckbox = page.locator('input[name="whatsappEnabled"]')
  if (!(await waCheckbox.isChecked())) await waCheckbox.check()
  await page.fill('input[name="whatsappNumber"]', '+15551234567')
  await shot('06-settings-whatsapp')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(1500)
  await shot('07-settings-saved')
  console.log('STEP: whatsapp enabled OK')

  console.log('STEP: read store slug from topbar')
  const slug = (await page.locator('header .text-sm.text-gray-500').first().innerText()).trim()
  console.log('SLUG:', slug)

  console.log('STEP: open public storefront (new context, unauthenticated customer)')
  const storeContext = await browser.newContext()
  const storePage = await storeContext.newPage()
  storePage.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[storefront console] ${msg.text()}`)
  })
  storePage.on('pageerror', (err) => errors.push(`[storefront pageerror] ${err.message}`))
  storePage.on('requestfailed', (req) => errors.push(`[storefront requestfailed] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`))

  await storePage.goto(`http://localhost:5173/store/${slug}`, { waitUntil: 'networkidle' })
  await storePage.waitForSelector('text=Camiseta Playwright', { timeout: 15000 })
  await storePage.screenshot({ path: `${SHOT_DIR}/08-storefront-home.png`, fullPage: true })
  console.log('SCREENSHOT 08-storefront-home')

  await storePage.click('text=Camiseta Playwright')
  await storePage.waitForSelector('button:has-text("Add to cart"), button:has-text("Agregar al carrito")', { timeout: 15000 })
  await storePage.screenshot({ path: `${SHOT_DIR}/09-storefront-product.png`, fullPage: true })
  console.log('SCREENSHOT 09-storefront-product')
  await storePage.click('button:has-text("Add to cart"), button:has-text("Agregar al carrito")')
  await storePage.waitForURL('**/cart', { timeout: 10000 })
  await storePage.screenshot({ path: `${SHOT_DIR}/10-storefront-cart.png`, fullPage: true })
  console.log('SCREENSHOT 10-storefront-cart')

  await storePage.click('a:has-text("Checkout"), a:has-text("Finalizar compra")')
  await storePage.waitForURL('**/checkout', { timeout: 10000 })
  await storePage.fill('input[name="customerName"]', 'Cliente Playwright')
  await storePage.fill('input[name="customerPhone"]', '+549111234567')
  await storePage.screenshot({ path: `${SHOT_DIR}/11-storefront-checkout.png`, fullPage: true })
  console.log('SCREENSHOT 11-storefront-checkout')

  const [popup] = await Promise.all([
    storeContext.waitForEvent('page', { timeout: 15000 }).catch(() => null),
    storePage.click('button:has-text("Place order"), button:has-text("Confirmar pedido")'),
  ])
  await storePage.waitForURL('**/order-confirmed/**', { timeout: 15000 })
  await storePage.screenshot({ path: `${SHOT_DIR}/12-order-confirmed.png`, fullPage: true })
  console.log('SCREENSHOT 12-order-confirmed')
  if (popup) {
    await popup.waitForLoadState('domcontentloaded').catch(() => {})
    console.log('POPUP_URL:', popup.url())
  } else {
    console.log('POPUP_URL: none (wa.me link may have opened same-context or been blocked)')
  }
} catch (err) {
  errors.push(`[test] ${err.message}`)
  await shot('99-failure-state').catch(() => {})
}

console.log('ERRORS_JSON_START')
console.log(JSON.stringify(errors, null, 2))
console.log('ERRORS_JSON_END')
console.log('EMAIL_USED:', email)

await browser.close()
