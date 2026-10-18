import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Playwright specs in e2e/ run with `pnpm e2e`, not vitest.
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
    // The auth tests hash passwords with scrypt and run a real Postgres in memory.
    // That is slow on small machines and CI runners, so give each test room.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
  // tsconfig keeps jsx as "preserve" for Next, so tests use the automatic runtime here.
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
