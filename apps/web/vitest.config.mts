import { defineConfig } from 'vitest/config';

// tsconfig keeps "jsx": "preserve" for Next, so tests need their own JSX transform.
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
});
