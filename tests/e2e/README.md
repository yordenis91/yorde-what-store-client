# E2E smoke scripts (Playwright)

Ad-hoc browser scripts used to verify full user flows against the running dev stack. Not part of the automated test suite (no assertions/CI wiring) — they print `OK:`/screenshot markers to stdout and save screenshots for manual review.

## Setup

```bash
npm install --no-save playwright
npx playwright install chromium chromium-headless-shell
```

## Running

Requires backend (`:3000`), frontend (`:5173`), Postgres and Redis (`docker compose up -d postgres redis` from repo root) already running.

```bash
node tests/e2e/basic-storefront-checkout.mjs
node tests/e2e/coupons-shipping-images.mjs
node tests/e2e/storefront-visual-check.mjs
node tests/e2e/mobile-nav-check.mjs
node tests/e2e/super-admin-panel.mjs
```

Screenshots are written to the path set by `SHOT_DIR` at the top of each script — update it to a local directory before running outside the original sandbox.

- `basic-storefront-checkout.mjs` — core happy path: register → product → enable WhatsApp → storefront → cart → checkout → order confirmed, opens the generated `wa.me` link.
- `coupons-shipping-images.mjs` — register → product + image upload → inline category create → WhatsApp settings → coupon CRUD → location/shipping CRUD → dashboard → storefront category filter → cart → checkout with shipping + live coupon validation → order confirmation.
- `storefront-visual-check.mjs` — focused visual pass on the storefront product gallery and checkout layout.
- `mobile-nav-check.mjs` — verifies the responsive sidebar drawer (hamburger open, overlay-click-to-close, auto-close on nav) at a 375px mobile viewport.
- `super-admin-panel.mjs` — full platform admin flow: tenant owner requests a paid plan upgrade → SUPER_ADMIN logs in (redirected to `/platform`) → tenant appears in the platform tenant list → deactivate/reactivate → create a plan → approve the pending upgrade request → owner sees the upgraded plan.

Test accounts created by these scripts use random suffixes (`owner-<hex>@test.com`, etc.) — clean them up from the database afterwards so they don't accumulate in `platform-tenants`/dashboards.
