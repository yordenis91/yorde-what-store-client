# Yorde What Store — Frontend

![CI](https://github.com/yordenis91/yorde-what-store-client/actions/workflows/ci.yml/badge.svg)
![Node](https://img.shields.io/badge/node-22-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/license-proprietary-lightgrey)

React + TypeScript + Vite single-page app for a multi-tenant ecommerce SaaS.
One build serves three distinct experiences from the same codebase: a
public storefront per tenant (its own subdomain, theme, and checkout
channels), a tenant admin panel, and a Super Admin platform console — with
no server-side rendering, yet still producing correct link previews and
per-tenant SEO metadata.

Pairs with the [`yorde-what-store-api`](https://github.com/yordenis91/yorde-what-store-api)
backend (NestJS + PostgreSQL, tenant isolation enforced via Row Level
Security), which this app consumes exclusively over its REST API.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
  - [Multi-tenant routing](#multi-tenant-routing)
  - [API base URL resolution](#api-base-url-resolution)
  - [State management](#state-management)
  - [Theming](#theming)
  - [i18n](#i18n)
  - [SEO on a pure SPA](#seo-on-a-pure-spa)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [npm scripts](#npm-scripts)
- [Testing](#testing)
- [Deployment](#deployment)
- [License](#license)

---

## Features

**Storefront** (public, per tenant)
- Product catalog, cart, and a guided multi-step checkout priced entirely
  by the server — nothing is computed client-side and trusted.
- Checkout can route through **WhatsApp or Telegram**, not just card
  payments (Stripe, MercadoPago) — a first-class fulfillment path, not an
  afterthought.
- Reachable either via a tenant subdomain (`store.yourdomain.com`) or a
  path fallback (`/store/:slug`) when subdomain routing isn't configured.
- Per-tenant runtime theming — 8 color palettes applied via CSS custom
  properties, no rebuild required per store.
- Customer accounts with order history, independent of the admin/staff
  session system.
- Per-page Open Graph/JSON-LD metadata (React 19 head-hoisting, no Helmet
  dependency) plus a server-side prerender proxy so links shared on
  WhatsApp/Telegram/Facebook/etc. unfurl correctly despite being a pure SPA.

**Admin** (tenant owner/staff panel)
- Dashboard with GMV/order charts (Recharts) and a QR code linking straight
  to the storefront.
- Product management with drag-and-drop image reordering (`@dnd-kit`,
  pointer + touch).
- Orders with a **live, real-time feed** via Server-Sent Events — new and
  updated orders appear without a refresh, with a sound/toast/badge count.
- Customers, coupons, shipping methods & pickup locations, staff
  invitations, email template customization, plans/billing, and store
  settings (branding, policies, payment credentials).

**Super Admin platform**
- Cross-tenant dashboard, tenant lifecycle management (create, suspend,
  reactivate, notes, history), and **impersonation** — acting as a
  tenant's owner from an audited, time-boxed session.
- Cross-tenant product moderation, subscription plan management, upgrade
  request approvals, a searchable/filterable audit log, and platform-wide
  business settings.

**Engineering**
- Two independent auth systems (staff/admin vs. storefront customer), each
  with its own token store and automatic refresh, so a leaked customer
  token can never reach an admin route.
- A connectivity store that tells "browser is offline" apart from "API
  unreachable" and drives a persistent banner with backoff-based recovery
  checks, instead of pages just failing silently.
- One Docker image, promoted across environments without a rebuild — the
  API URL and storefront root domain are runtime-configurable (see
  [API base URL resolution](#api-base-url-resolution)).
- Full English/Spanish i18n, with `<html lang>` kept in sync.
- A test suite that fails the build if a test stops compiling, not just if
  it stops passing.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | React 19 |
| Build tool | Vite 8 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Routing | React Router 6 |
| Server state | TanStack React Query |
| Client state | Zustand |
| Forms | React Hook Form + Zod |
| HTTP | Axios |
| Charts | Recharts |
| Drag & drop | dnd-kit |
| i18n | i18next / react-i18next |
| Toasts | Sonner |
| Testing | Vitest + Testing Library (jsdom); ad-hoc Playwright scripts for real-browser checks |
| Deployment | Docker (multi-stage build → nginx) |

## Architecture

### Multi-tenant routing

The app decides what to render **before mounting React Router**, based on
the hostname:

1. `src/config/storefront.ts` checks whether the current hostname is a
   direct subdomain of a configured root domain (excluding reserved names
   like `www`, `api`, `admin`). If so, that subdomain *is* the tenant slug.
2. On a store subdomain, `App.tsx` renders **only** the storefront route
   tree — admin, auth, and platform routes are unreachable there by
   design, not just hidden. The auth-bootstrap hook is skipped entirely
   (checkout on a storefront is guest-first, so there's no session to
   silently refresh).
3. Otherwise, the app renders the full tree: landing/legal pages,
   `/login` `/register` `/2fa`, `/admin/*` (guarded — a `SUPER_ADMIN`
   session is redirected to `/platform`), `/platform/*` (guarded the
   other way), and `/store/:slug` as the storefront fallback when no root
   domain is configured at all.

### API base URL resolution

`src/services/api-client.ts` resolves the API base URL in this order:
a runtime value (`window.__APP_CONFIG__`, populated from `public/config.js`)
→ the build-time `VITE_API_URL` → `http://localhost:3000/api/v1`.

`public/config.js` ships with placeholder values; `docker-entrypoint.sh`
rewrites it from the **container's** environment variables at boot. This
means the same built Docker image can be deployed to staging and
production — or promoted from one to the other — without a rebuild, which
a purely build-time `VITE_API_URL` would otherwise force.

### State management

- **Server state**: TanStack React Query for everything that comes from
  the API (`staleTime: 30s`, no refetch on window focus).
- **Client state**: Zustand stores in `src/store/` — `auth` (staff/admin
  session + impersonation), `customer` (storefront session, memory-only,
  refreshed via an httpOnly cookie), `cart` (persisted, tenant-scoped),
  `connectivity` (network health), `order-notifications` (fed by the SSE
  order stream).
- **Forms**: React Hook Form, with Zod validation on the forms where
  correctness matters most (auth, checkout, tenant creation).

### Theming

A fixed set of 8 named palettes (`src/config/themes.ts`) map to five CSS
custom properties, applied directly on `documentElement` for the active
storefront and cleared on unmount. Deliberately a closed set, not an
arbitrary string from the API — a tenant's theme name can never inject
into a stylesheet.

### i18n

English and Spanish, via i18next + `react-i18next` +
`i18next-browser-languagedetector` (browser language → `localStorage`
override, in that priority). Falls back to English.

### SEO on a pure SPA

This app has no server-side rendering, which is normally fatal for link
previews and search indexing. Two complementary mechanisms address that:

- **`Seo` component** (per storefront page): uses React 19's native head
  hoisting to emit `<title>`, canonical/`noindex`, Open Graph, Twitter
  card, and optional JSON-LD tags from anywhere in the component tree —
  no Helmet library. This is enough for crawlers that execute JavaScript
  (Google), but link-unfurling bots (WhatsApp, Telegram, Facebook, iMessage,
  Slack, Discord, ...) read raw HTML and never see it.
- **nginx prerender proxy** (`docker-entrypoint.sh` + `nginx.conf`,
  Docker deployments only): if `PRERENDER_UPSTREAM` is set, nginx matches
  the request's `User-Agent` against a list of known unfurl bots and, only
  for those, proxies the document request to the API's server-rendered
  preview endpoint instead of serving the SPA shell. Search engine
  crawlers are deliberately excluded from this — they should see the real
  app. Left unset, this is fully inert.

## Project structure

```
src/
├── pages/
│   ├── auth/          Login, register, 2FA
│   ├── admin/         Tenant owner/staff panel (dashboard, products, orders,
│   │                  customers, coupons, shipping, staff, email templates,
│   │                  plans, store settings)
│   ├── platform/      Super Admin console (dashboard, tenants, product
│   │                  moderation, plans, category templates, upgrade
│   │                  requests, audit log, platform settings)
│   ├── storefront/    Public storefront (home, product, cart, checkout,
│   │                  order confirmation, customer account, policy pages)
│   └── legal/         Platform-level Terms of Service / Privacy Policy
├── components/
│   ├── layout/        AdminLayout, SuperAdminLayout, PublicLayout, AuthLayout,
│   │                  route guards (ProtectedRoute, PlatformRoute)
│   ├── storefront/    Seo, ProductCard, QuantityStepper, BackLink, ...
│   └── ui/            Shared primitives (Button, Card, Input, Modal, ...)
├── services/          One module per API resource; axios instance + interceptors
├── store/             Zustand stores (see State management)
├── hooks/             useOrderEvents (SSE), useBootstrapAuth, ...
├── config/            storefront.ts (tenant resolution), themes.ts, runtime.ts
├── i18n/              i18next setup + locales/{en,es}/common.json
└── utils/             Formatting, SEO helpers, category-tree building, ...

tests/
├── setup.ts, factories.ts   Shared Vitest fixtures
└── e2e/                     Ad-hoc Playwright scripts against a real running
                             stack (excluded from `npm test` — see Testing)
```

## Getting started

### Prerequisites

- Node.js 22
- A running instance of [`yorde-what-store-api`](https://github.com/yordenis91/yorde-what-store-api)
  (or point `VITE_API_URL` at a deployed one)

### Install & run

```bash
npm install
npm run dev          # http://localhost:5173, proxies to http://localhost:3000/api/v1 by default
```

If the API isn't running on the default port, copy `.env.example` (if
present) or set `VITE_API_URL` directly — see
[Environment variables](#environment-variables).

## Environment variables

| Variable | Where it's read | Default | Notes |
| --- | --- | --- | --- |
| `VITE_API_URL` | Build-time (`import.meta.env`) | `http://localhost:3000/api/v1` | Overridden at runtime in Docker deployments — see [API base URL resolution](#api-base-url-resolution). |
| `VITE_STOREFRONT_ROOT_DOMAIN` | Build-time | *(unset)* | Apex domain for subdomain-based storefronts (e.g. `yourplatform.com` so `acme.yourplatform.com` resolves tenant `acme`). Unset disables subdomain mode — stores stay reachable at `/store/:slug`. |

Docker-only, consumed by `docker-entrypoint.sh`/`nginx.conf` (not read by
`src/` at all):

| Variable | Default | Notes |
| --- | --- | --- |
| `PRERENDER_UPSTREAM` | *(unset — feature inert)* | Enables the link-unfurl-bot prerender proxy. Point it at the API's internal address. |
| `UPLOADS_UPSTREAM` | falls back to `PRERENDER_UPSTREAM` | Where `/uploads/` (product images) is proxied to. `/uploads/` 502s if neither this nor `PRERENDER_UPSTREAM` is set. |
| `DNS_RESOLVER` | `127.0.0.11` | Docker's embedded DNS — only relevant if you're not running under Docker's default network. |

## npm scripts

| Script | Does what |
| --- | --- |
| `dev` | Vite dev server with HMR. |
| `build` | `tsc -b` (type-checks app **and** tests) then `vite build`. A test file that no longer compiles fails this, not just `npm test`. |
| `preview` | Serve the production build locally. |
| `lint` | Oxlint (no `--fix` — check-only). |
| `test` | Run the Vitest suite once. |
| `test:watch` | Vitest watch mode. |
| `test:cov` | Vitest with coverage. |

## Testing

```bash
npm test              # run the suite
npm run test:watch    # re-run on change
npm run test:cov      # with coverage
```

Vitest with jsdom and Testing Library. Tests live next to the code they cover
(`*.test.ts` / `*.test.tsx`); shared fixtures and setup are in `tests/`. They
need no running backend — network calls are mocked at the service module.

`npm run build` type-checks the tests as well, so a test that no longer compiles
fails the build instead of being quietly skipped.

What is covered:

| Area | Why it is covered |
| --- | --- |
| `config/storefront` — host → tenant resolution | A suffix-only match would let `midominio.com.evil.com` serve another tenant's storefront. |
| `config/themes` | An unknown theme name must degrade to the default palette, and leaving a store must not leave the platform tinted. |
| `store/cart.store` | Line merging, variant separation, and clearing the basket when the shopper moves between stores that share an origin. |
| `ProductCard` | Stock state must not surface at all unless the store tracks inventory — reading the default `quantity` of 0 as stock once marked every product sold out. |
| `StorefrontCheckoutPage` | Step gating, server-quoted totals, the delivery address, and that reaching the last step does not place the order. |
| `BackLink` | Shared links mean a product page is often the session's first page; stepping back blindly would leave the site. |
| `useOrderEvents` | The SSE connection lifecycle for live order updates. |
| `QuantityStepper`, `utils/*` (including `utils/seo`) | Bounds, formatting, and metadata-tag generation. |

### What these tests do not cover

- **No real backend.** Service modules are mocked, so the API contract is
  assumed, not verified. A backend change that alters a response shape will not
  fail these tests.
- **No real browser.** jsdom approximates layout and does not run CSS, so
  visual regressions and anything depending on real layout go unnoticed.
- The Playwright scripts in `tests/e2e/` still drive a real browser against a
  running stack; they are ad-hoc and excluded from this suite.

### CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull
request: install, lint, and the Vitest suite.

## Deployment

See **[`DEPLOY.md`](./DEPLOY.md)** for the full walkthrough: the Docker
image (Vite build → nginx), the runtime `config.js` mechanism that lets one
image serve multiple environments, the link-preview/uploads proxy setup,
and deploying the whole platform (this app + the API + Postgres + Redis)
on EasyPanel.

## License

Proprietary — all rights reserved. Not licensed for reuse or redistribution.
