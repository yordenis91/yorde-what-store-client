import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * Kept separate from vite.config.ts so the dev/build pipeline stays untouched —
 * notably the Tailwind plugin, which tests have no use for and which would
 * otherwise process CSS on every run.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.{ts,tsx}'],
    // The Playwright scripts under tests/e2e drive a real browser against a
    // running stack; they are not Vitest suites.
    exclude: ['node_modules', 'dist', 'tests/e2e/**'],
    // Both matter: clearMocks wipes call history between tests (without it an
    // assertion on mock.calls[0] silently reads a previous test's call), and
    // restoreMocks puts spied-on originals back.
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/main.tsx', 'src/i18n/**'],
    },
  },
})
