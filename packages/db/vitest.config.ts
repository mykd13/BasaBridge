import { defineConfig } from 'vitest/config';

// PGlite takes several seconds to start on a busy machine or CI runner.
export default defineConfig({
  test: { testTimeout: 60_000, hookTimeout: 60_000 },
});
