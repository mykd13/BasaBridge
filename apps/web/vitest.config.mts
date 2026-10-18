import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // tsconfig keeps jsx as "preserve" for Next, so tests use the automatic runtime here.
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    // The auth tests hash passwords with scrypt and run a real Postgres in memory.
    // That is slow on small machines and CI runners, so give each test room.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
