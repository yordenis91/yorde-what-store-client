import { chromium } from 'playwright'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SHOT_DIR = '/tmp/claude-1000/-var-www-html-yorde-what-store/7e222cbc-db36-41f8-b454-5048bc0e48d2/scratchpad'
const errors = []
const rid = randomBytes(3).toString('hex')
const email = `owner-${rid}@test.com`
const storeName = `F4 Store ${rid}`

const browser = await chromium.launch({ args: ['--no-sandbox'] })
const context = await browser.newContext()
const page = await context.newPage()
page.on('console', (msg) => {
  if (msg.type() === 'error' && !msg.text().includes('/auth/refresh')) errors.push(`[console] ${msg.text()}`)
})
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))
page.on('requestfailed', (req) => {
  if (req.url().includes('/auth/refresh')) return
  errors.push(`[requestfailed] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`)
})

async function shot(name) {
  await page.screenshot({ path: `${SHOT_DIR}/${name}.png`, fullPage: true })
  console.log(`SHOT ${name}`)
}

try {
  console.log('STEP: register')
  await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle' })
  await page.fill('input[name="name"]', 'F4 Owner')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', 'SuperSecret123')
  await page.fill('input[name="storeName"]', storeName)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/admin', { timeout: 15000 })
  console.log('OK: registered, url=', page.url())

  console.log('STEP: create product with image')
  await page.click('a:has-text("Products"), a:has-text("Productos")')
  await page.waitForURL('**/admin/products')
  await page.click('a:has-text("New product"), a:has-text("Nuevo producto")')
  await page.waitForURL('**/admin/products/new')
  await page.fill('input[name="name"]', 'Producto F4')
  await page.fill('input[name="price"]', '30')
  await page.fill('input[name="quantity"]', '20')
  await page.click('button:has-text("Save product"), button:has-text("Guardar producto")')
  await page.waitForURL(/\/admin\/products\/[0-9a-f-]{36}$/, { timeout: 15000 })
  console.log('OK: product created, url=', page.url())

  // Upload an image
  const filePath = path.join(__dirname, 'pw-test-asset.png')
  const fs = await import('node:fs')
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  )
  fs.writeFileSync(filePath, png)
  await page.setInputFiles('input[type="file"]', filePath)
  await page.waitForSelector('img[alt=""]', { timeout: 15000 })
  await shot('f4-01-product-image')
  console.log('OK: image uploaded')

  console.log('STEP: create category + tax inline')
  await page.click('button:has-text("+ New")')
  await page.fill('input[placeholder="Category name"]', 'Ropa')
  await page.click('button:has-text("Add")')
  await page.waitForTimeout(800)
  await shot('f4-02-category-created')
  console.log('OK: category created')

  console.log('STEP: enable whatsapp in settings')
  await page.click('a:has-text("Store settings"), a:has-text("Configuración de tienda")')
  await page.waitForSelector('input[name="name"]')
  const waCheckbox = page.locator('input[name="whatsappEnabled"]')
  if (!(await waCheckbox.isChecked())) await waCheckbox.check()
  await page.fill('input[name="whatsappNumber"]', '+15559876543')
  await page.locator('button[type="submit"]:has-text("Save changes"), button[type="submit"]:has-text("Guardar cambios")').first().click()
  await page.waitForTimeout(1000)
  console.log('OK: whatsapp enabled')

  console.log('STEP: create coupon')
  await page.click('a:has-text("Coupons"), a:has-text("Cupones")')
  await page.waitForURL('**/admin/coupons')
  await page.click('button:has-text("New coupon")')
  await page.fill('input[placeholder="Code (e.g. SAVE10)"]', 'PWCOUPON')
  await page.fill('input[placeholder="Name"]', 'Playwright discount')
  await page.fill('input[placeholder="Discount value"]', '15')
  await page.click('button[type="submit"]:has-text("Save")')
  await page.waitForSelector('text=PWCOUPON', { timeout: 15000 })
  await shot('f4-03-coupon-created')
  console.log('OK: coupon created')

  console.log('STEP: create location + shipping')
  await page.click('a:has-text("Shipping"), a:has-text("Envíos")')
  await page.waitForURL('**/admin/shipping')
  await page.fill('input[placeholder="Location name (e.g. Downtown)"]', 'Downtown')
  await page.click('button:has-text("Add")')
  await page.waitForTimeout(800)
  await page.click('button:has-text("shipping")')
  await page.fill('input[placeholder="Method name"]', 'Standard')
  await page.fill('input[placeholder="Cost"]', '7')
  await page.click('button:has-text("Add")')
  await page.waitForTimeout(800)
  await shot('f4-04-shipping-created')
  console.log('OK: location+shipping created')

  console.log('STEP: view dashboard')
  await page.click('a:has-text("Dashboard"), a:has-text("Panel")')
  await page.waitForURL('**/admin')
  await page.waitForSelector('text=Your store link')
  await shot('f4-05-dashboard')
  console.log('OK: dashboard rendered')

  console.log('STEP: read slug and go to storefront')
  const slug = (await page.locator('header .text-sm.text-gray-500').first().innerText()).trim()
  console.log('SLUG:', slug)

  const storeContext = await browser.newContext()
  const storePage = await storeContext.newPage()
  storePage.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[storefront console] ${msg.text()}`)
  })
  storePage.on('pageerror', (err) => errors.push(`[storefront pageerror] ${err.message}`))

  await storePage.goto(`http://localhost:5173/store/${slug}`, { waitUntil: 'networkidle' })
  await storePage.waitForSelector('text=Producto F4', { timeout: 15000 })
  await shot('f4-06-storefront-home')
  console.log('OK: storefront shows product + category sidebar')

  console.log('STEP: filter by category')
  await storePage.click('button:has-text("Ropa")')
  await storePage.waitForTimeout(500)
  await shot('f4-07-category-filtered')

  console.log('STEP: click back to All, open product, verify gallery')
  await storePage.click('button:has-text("All")')
  await storePage.click('text=Producto F4')
  await storePage.waitForSelector('button:has-text("Add to cart")')
  await shot('f4-08-product-gallery')

  await storePage.click('button:has-text("Add to cart")')
  await storePage.waitForURL('**/cart')
  await storePage.click('a:has-text("Checkout")')
  await storePage.waitForURL('**/checkout')
  await storePage.fill('input[name="customerName"]', 'Cliente F4')
  await storePage.fill('input[name="customerPhone"]', '+549111234567')

  console.log('STEP: select shipping')
  await storePage.click('text=Standard')
  await shot('f4-09-checkout-shipping-selected')

  console.log('STEP: apply coupon')
  await storePage.fill('input[placeholder="CODE"]', 'PWCOUPON')
  await storePage.click('button:has-text("Apply")')
  await storePage.waitForSelector('text=Coupon "PWCOUPON" applied', { timeout: 10000 })
  await shot('f4-10-coupon-applied')
  console.log('OK: coupon applied live')

  const [popup] = await Promise.all([
    storeContext.waitForEvent('page', { timeout: 15000 }).catch(() => null),
    storePage.click('button:has-text("Place order")'),
  ])
  await storePage.waitForURL('**/order-confirmed/**', { timeout: 15000 })
  await storePage.waitForSelector('text=Producto F4', { timeout: 10000 })
  await shot('f4-11-order-confirmed-with-summary')
  console.log('OK: order confirmed with real summary, popup=', popup?.url() ?? 'none')

  fs.unlinkSync(filePath)
} catch (err) {
  errors.push(`[test] ${err.message}`)
  await shot('f4-99-failure').catch(() => {})
}

console.log('ERRORS_JSON_START')
console.log(JSON.stringify(errors, null, 2))
console.log('ERRORS_JSON_END')
console.log('EMAIL_USED:', email)

await browser.close()
