import { chromium } from 'playwright'
import { randomBytes } from 'node:crypto'

const SHOT_DIR = '/tmp/claude-1000/-var-www-html-yorde-what-store/7e222cbc-db36-41f8-b454-5048bc0e48d2/scratchpad'
const rid = randomBytes(3).toString('hex')
const email = `visual-${rid}@test.com`

const browser = await chromium.launch({ args: ['--no-sandbox'] })
const page = await browser.newPage()

await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle' })
await page.fill('input[name="name"]', 'Visual Owner')
await page.fill('input[name="email"]', email)
await page.fill('input[name="password"]', 'SuperSecret123')
await page.fill('input[name="storeName"]', `Visual Store ${rid}`)
await page.click('button[type="submit"]')
await page.waitForURL('**/admin', { timeout: 15000 })

await page.click('a:has-text("Products")')
await page.waitForURL('**/admin/products')
await page.click('a:has-text("New product")')
await page.waitForURL('**/admin/products/new')
await page.fill('input[name="name"]', 'Visual Product')
await page.fill('input[name="price"]', '40')
await page.fill('input[name="quantity"]', '10')
await page.click('button:has-text("Save product")')
await page.waitForURL(/\/admin\/products\/[0-9a-f-]{36}$/, { timeout: 15000 })

const fs = await import('node:fs')
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)
fs.writeFileSync('/tmp/pw-asset.png', png)
await page.setInputFiles('input[type="file"]', '/tmp/pw-asset.png')
await page.waitForSelector('img[alt=""]', { timeout: 15000 })
await page.setInputFiles('input[type="file"]', '/tmp/pw-asset.png')
await page.waitForTimeout(1500)

await page.click('a:has-text("Store settings")')
await page.waitForSelector('input[name="name"]')
await page.locator('input[name="whatsappEnabled"]').check()
await page.fill('input[name="whatsappNumber"]', '+15551112222')
await page.locator('button[type="submit"]:has-text("Save changes")').first().click()
await page.waitForTimeout(1000)

const slug = (await page.locator('header .text-sm.text-gray-500').first().innerText()).trim()

const storePage = await browser.newPage()
await storePage.goto(`http://localhost:5173/store/${slug}`, { waitUntil: 'networkidle' })
await storePage.waitForSelector('text=Visual Product', { timeout: 15000 })
await storePage.screenshot({ path: `${SHOT_DIR}/visual-01-home.png`, fullPage: true })

await storePage.click('text=Visual Product')
await storePage.waitForSelector('button:has-text("Add to cart")')
await storePage.screenshot({ path: `${SHOT_DIR}/visual-02-product-gallery.png`, fullPage: true })

await storePage.click('button:has-text("Add to cart")')
await storePage.waitForURL('**/cart')
await storePage.click('a:has-text("Checkout")')
await storePage.waitForURL('**/checkout')
await storePage.fill('input[name="customerName"]', 'Visual Customer')
await storePage.fill('input[name="customerPhone"]', '+549111234567')
await storePage.screenshot({ path: `${SHOT_DIR}/visual-03-checkout.png`, fullPage: true })

console.log('DONE, slug=', slug)
await browser.close()
