import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Playwright specs in e2e/ run with `pnpm e2e`, not vitest.
  test: { exclude: ['e2e/**', 'node_modules/**', '.next/**'] },
  // tsconfig keeps jsx as "preserve" for Next, so tests use the automatic runtime here.
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
