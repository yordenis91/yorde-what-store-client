import { chromium } from 'playwright'
import { randomBytes } from 'node:crypto'

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
page.on('requestfailed', (req) => errors.push(`[requestfailed] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`))

async function shot(name) {
  await page.screenshot({ path: `/tmp/claude-1000/-var-www-html-yorde-what-store/7e222cbc-db36-41f8-b454-5048bc0e48d2/scratchpad/${name}.png`, fullPage: true })
  console.log(`SCREENSHOT ${name}`)
}

try {
  console.log('STEP: goto landing')
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
  await shot('01-landing')

  console.log('STEP: goto register')
  await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle' })
  await page.fill('input[name="name"]', 'Test Owner')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', 'SuperSecret123')
  await page.fill('input[name="storeName"]', storeName)
  await shot('02-register-filled')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/admin', { timeout: 15000 })
  await shot('03-admin-dashboard')
  console.log('STEP: register+redirect OK, url=', page.url())

  console.log('STEP: go to products, create product')
  await page.goto('http://localhost:5173/admin/products/new', { waitUntil: 'networkidle' })
  await page.fill('input[name="name"]', 'Camiseta Playwright')
  await page.fill('input[name="price"]', '25')
  await page.fill('input[name="quantity"]', '50')
  await shot('04-product-form-filled')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/admin/products', { timeout: 15000 })
  await shot('05-products-list')
  console.log('STEP: product created OK')

  console.log('STEP: go to settings, enable whatsapp')
  await page.goto('http://localhost:5173/admin/settings', { waitUntil: 'networkidle' })
  await page.waitForSelector('input[name="name"]')
  const waCheckbox = page.locator('input[name="whatsappEnabled"]')
  if (!(await waCheckbox.isChecked())) await waCheckbox.check()
  await page.fill('input[name="whatsappNumber"]', '+15551234567')
  await shot('06-settings-whatsapp')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(1000)
  await shot('07-settings-saved')
  console.log('STEP: whatsapp enabled OK')

  console.log('STEP: read store slug from topbar')
  const slug = await page.locator('header .text-sm.text-gray-500').first().innerText()
  console.log('SLUG:', slug)

  console.log('STEP: open public storefront')
  const storePage = await context.newPage()
  storePage.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[storefront console] ${msg.text()}`)
  })
  storePage.on('pageerror', (err) => errors.push(`[storefront pageerror] ${err.message}`))
  storePage.on('requestfailed', (req) => errors.push(`[storefront requestfailed] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`))

  await storePage.goto(`http://localhost:5173/store/${slug}`, { waitUntil: 'networkidle' })
  await storePage.screenshot({ path: '/tmp/claude-1000/-var-www-html-yorde-what-store/7e222cbc-db36-41f8-b454-5048bc0e48d2/scratchpad/08-storefront-home.png', fullPage: true })
  console.log('SCREENSHOT 08-storefront-home')

  await storePage.click('text=Camiseta Playwright')
  await storePage.waitForSelector('button:has-text("Add to cart")')
  await storePage.screenshot({ path: '/tmp/claude-1000/-var-www-html-yorde-what-store/7e222cbc-db36-41f8-b454-5048bc0e48d2/scratchpad/09-storefront-product.png', fullPage: true })
  console.log('SCREENSHOT 09-storefront-product')
  await storePage.click('button:has-text("Add to cart")')
  await storePage.waitForURL('**/cart', { timeout: 10000 })
  await storePage.screenshot({ path: '/tmp/claude-1000/-var-www-html-yorde-what-store/7e222cbc-db36-41f8-b454-5048bc0e48d2/scratchpad/10-storefront-cart.png', fullPage: true })
  console.log('SCREENSHOT 10-storefront-cart')

  await storePage.click('button:has-text("Checkout")')
  await storePage.waitForURL('**/checkout', { timeout: 10000 })
  await storePage.fill('input[name="customerName"]', 'Cliente Playwright')
  await storePage.fill('input[name="customerPhone"]', '+549111234567')
  await storePage.screenshot({ path: '/tmp/claude-1000/-var-www-html-yorde-what-store/7e222cbc-db36-41f8-b454-5048bc0e48d2/scratchpad/11-storefront-checkout.png', fullPage: true })
  console.log('SCREENSHOT 11-storefront-checkout')

  const [popup] = await Promise.all([
    context.waitForEvent('page', { timeout: 15000 }).catch(() => null),
    storePage.click('button:has-text("Place order"), button:has-text("Confirmar pedido")'),
  ])
  await storePage.waitForURL('**/order-confirmed/**', { timeout: 15000 })
  await storePage.screenshot({ path: '/tmp/claude-1000/-var-www-html-yorde-what-store/7e222cbc-db36-41f8-b454-5048bc0e48d2/scratchpad/12-order-confirmed.png', fullPage: true })
  console.log('SCREENSHOT 12-order-confirmed')
  if (popup) {
    console.log('POPUP_URL:', popup.url())
  } else {
    console.log('POPUP_URL: none (wa.me link may have opened same-context or been blocked)')
  }

} catch (err) {
  errors.push(`[test] ${err.message}`)
}

console.log('ERRORS_JSON_START')
console.log(JSON.stringify(errors, null, 2))
console.log('ERRORS_JSON_END')
console.log('EMAIL_USED:', email)

await browser.close()
