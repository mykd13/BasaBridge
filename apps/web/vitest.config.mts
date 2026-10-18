import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // PGlite takes several seconds to start on a busy machine or CI runner.
  test: { testTimeout: 60_000, hookTimeout: 60_000 },
  // tsconfig keeps jsx as "preserve" for Next, so tests use the automatic runtime here.
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` throws outside a React Server Components build. Tests run server code
      // directly, so they get an empty stand-in. Next builds still use the real guard.
      'server-only': fileURLToPath(new URL('./src/test/server-only.ts', import.meta.url)),
    },
  },
});
