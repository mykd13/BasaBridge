import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The auth tests hash passwords with scrypt and run a real Postgres in memory.
    // That is slow on small machines and CI runners, so give each test room.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
