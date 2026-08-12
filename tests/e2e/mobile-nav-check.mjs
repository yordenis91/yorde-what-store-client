import { chromium } from 'playwright'
import { randomBytes } from 'node:crypto'

const SHOT_DIR = '/tmp/claude-1000/-var-www-html-yorde-what-store/7e222cbc-db36-41f8-b454-5048bc0e48d2/scratchpad'
const rid = randomBytes(3).toString('hex')

const browser = await chromium.launch({ args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 375, height: 667 } })

await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle' })
await page.fill('input[name="name"]', 'Mobile Owner')
await page.fill('input[name="email"]', `mobile-${rid}@test.com`)
await page.fill('input[name="password"]', 'SuperSecret123')
await page.fill('input[name="storeName"]', `Mobile Store ${rid}`)
await page.click('button[type="submit"]')
await page.waitForURL('**/admin', { timeout: 15000 })
await page.waitForSelector('text=Dashboard')
await page.screenshot({ path: `${SHOT_DIR}/mobile-01-dashboard-closed.png` })
console.log('SHOT mobile-01-dashboard-closed (sidebar should be hidden, hamburger visible)')

await page.click('button[aria-label="Open menu"]')
await page.waitForTimeout(300)
await page.screenshot({ path: `${SHOT_DIR}/mobile-02-menu-open.png` })
console.log('SHOT mobile-02-menu-open (drawer should slide in with overlay)')

await page.click('a:has-text("Products")')
await page.waitForURL('**/admin/products')
await page.waitForTimeout(300)
await page.screenshot({ path: `${SHOT_DIR}/mobile-03-after-nav-closed.png` })
console.log('SHOT mobile-03-after-nav-closed (menu should auto-close after navigating)')

await page.click('button[aria-label="Open menu"]')
await page.waitForTimeout(300)
// Click the visible backdrop sliver to the right of the 264px-wide drawer (not the element center,
// which sits underneath the drawer on a 375px-wide viewport).
await page.mouse.click(340, 400)
await page.waitForTimeout(300)
await page.screenshot({ path: `${SHOT_DIR}/mobile-04-overlay-click-closed.png` })
console.log('SHOT mobile-04-overlay-click-closed (clicking overlay should close menu)')

await browser.close()
console.log('DONE')
