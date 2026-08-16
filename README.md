# Yorde What Store — Frontend

SPA de React + TypeScript + Vite para la plataforma de ecommerce multitenante.
La API vive en [`yorde-what-store-api`](https://github.com/yordenis91/yorde-what-store-api).

Para desplegar en un VPS con EasyPanel, y para el arranque en local de la pila
completa, consulta **[DEPLOY.md](./DEPLOY.md)**.

## Tests

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
| `QuantityStepper`, `utils/*` | Bounds and formatting. |

### What these tests do not cover

- **No real backend.** Service modules are mocked, so the API contract is
  assumed, not verified. A backend change that alters a response shape will not
  fail these tests.
- **No real browser.** jsdom approximates layout and does not run CSS, so
  visual regressions and anything depending on real layout go unnoticed.
- The Playwright scripts in `tests/e2e/` still drive a real browser against a
  running stack; they are ad-hoc and excluded from this suite.

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
