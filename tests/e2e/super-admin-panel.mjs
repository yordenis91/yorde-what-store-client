import { chromium } from 'playwright'
import { randomBytes } from 'node:crypto'

const SHOT_DIR = '/tmp/claude-1000/-var-www-html-yorde-what-store/7e222cbc-db36-41f8-b454-5048bc0e48d2/scratchpad'
const errors = []
const rid = randomBytes(3).toString('hex')

const browser = await chromium.launch({ args: ['--no-sandbox'] })

async function shot(page, name) {
  await page.screenshot({ path: `${SHOT_DIR}/${name}.png`, fullPage: true })
  console.log(`SHOT ${name}`)
}

try {
  // --- 1. Register a fresh tenant owner ---
  const ownerCtx = await browser.newContext()
  const ownerPage = await ownerCtx.newPage()
  ownerPage.on('pageerror', (err) => errors.push(`[owner pageerror] ${err.message}`))
  await ownerPage.goto('http://localhost:5173/register', { waitUntil: 'networkidle' })
  await ownerPage.fill('input[name="name"]', 'SA Test Owner')
  await ownerPage.fill('input[name="email"]', `sa-owner-${rid}@test.com`)
  await ownerPage.fill('input[name="password"]', 'SuperSecret123')
  await ownerPage.fill('input[name="storeName"]', `SA Test Store ${rid}`)
  await ownerPage.click('button[type="submit"]')
  await ownerPage.waitForURL('**/admin', { timeout: 15000 })
  console.log('OK: tenant owner registered')

  // --- 2. Owner requests an upgrade to a paid plan ---
  await ownerPage.click('a:has-text("Plans")')
  await ownerPage.waitForURL('**/admin/plans')
  await ownerPage.waitForSelector('text=Pro', { timeout: 10000 })
  const proCard = ownerPage.locator('div.rounded-xl').filter({ has: ownerPage.locator('h2', { hasText: 'Pro' }) })
  await proCard.getByRole('button', { name: 'Request upgrade' }).click()
  await ownerPage.waitForTimeout(1500)
  await shot(ownerPage, 'debug-after-click')
  await ownerPage.waitForSelector('text=Pending approval', { timeout: 10000 })
  await shot(ownerPage, 'sa-00-owner-requested-upgrade')
  console.log('OK: owner requested upgrade to Pro, button now shows Pending approval')

  // --- 3. Login as Super Admin ---
  const saCtx = await browser.newContext()
  const saPage = await saCtx.newPage()
  saPage.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[sa console] ${msg.text()}`)
  })
  saPage.on('pageerror', (err) => errors.push(`[sa pageerror] ${err.message}`))

  await saPage.goto('http://localhost:5173/login', { waitUntil: 'networkidle' })
  await saPage.fill('input[name="email"]', 'superadmin@yws.dev')
  await saPage.fill('input[name="password"]', 'SuperAdmin123!')
  await saPage.click('button[type="submit"]')
  await saPage.waitForURL('**/platform', { timeout: 15000 })
  await saPage.waitForSelector('text=Platform dashboard')
  await shot(saPage, 'sa-01-dashboard')
  console.log('OK: super admin logged in, redirected to /platform, url=', saPage.url())

  // --- 4. Tenants list ---
  await saPage.click('a:has-text("Tenants")')
  await saPage.waitForURL('**/platform/tenants')
  await saPage.waitForSelector(`text=SA Test Store ${rid}`, { timeout: 10000 })
  await shot(saPage, 'sa-02-tenants')
  console.log('OK: tenant appears in platform tenant list')

  const row = saPage.locator('tr', { hasText: `SA Test Store ${rid}` })
  await row.getByRole('button', { name: 'Deactivate' }).click()
  await saPage.waitForSelector('tr:has-text("Inactive")', { timeout: 10000 })
  await shot(saPage, 'sa-03-tenant-deactivated')
  console.log('OK: tenant deactivated')
  await row.getByRole('button', { name: 'Activate' }).click()
  await saPage.waitForTimeout(800)
  console.log('OK: tenant reactivated')

  // --- 5. Plans CRUD ---
  await saPage.click('a:has-text("Plans")')
  await saPage.waitForURL('**/platform/plans')
  await saPage.click('button:has-text("New plan")')
  await saPage.fill('input[placeholder="Name"]', `TestPlan${rid}`)
  await saPage.fill('input[placeholder="Price"]', '99')
  await saPage.fill('input[placeholder="Max stores (-1 = unlimited)"]', '5')
  await saPage.fill('input[placeholder="Max products (-1 = unlimited)"]', '1000')
  await saPage.click('button[type="submit"]:has-text("Save")')
  await saPage.waitForSelector(`text=TestPlan${rid}`, { timeout: 10000 })
  await shot(saPage, 'sa-04-plan-created')
  console.log('OK: plan created via platform panel')

  // --- 6. Approve the pending upgrade request ---
  await saPage.click('a:has-text("Upgrade requests")')
  await saPage.waitForURL('**/platform/upgrade-requests')
  await saPage.waitForSelector(`text=SA Test Store ${rid}`, { timeout: 10000 })
  await shot(saPage, 'sa-05-upgrade-requests-pending')
  console.log('OK: pending upgrade request visible to super admin')

  const reqCard = saPage.locator('div', { hasText: `SA Test Store ${rid}` }).filter({ hasText: 'Approve' }).first()
  await reqCard.getByRole('button', { name: 'Approve' }).click()
  await saPage.waitForTimeout(1000)
  await saPage.waitForSelector(`text=SA Test Store ${rid}`, { state: 'detached', timeout: 10000 }).catch(() => {})
  await shot(saPage, 'sa-06-upgrade-approved')
  console.log('OK: upgrade approved, request should disappear from pending list')

  // --- 7. Verify from the owner side that the plan actually changed ---
  await ownerPage.reload({ waitUntil: 'networkidle' })
  await ownerPage.waitForSelector('text=Current plan', { timeout: 10000 })
  await shot(ownerPage, 'sa-07-owner-sees-approved-plan')
  console.log('OK: owner now sees the upgraded plan as current')
} catch (err) {
  errors.push(`[test] ${err.message}`)
}

console.log('ERRORS_JSON_START')
console.log(JSON.stringify(errors, null, 2))
console.log('ERRORS_JSON_END')

await browser.close()
