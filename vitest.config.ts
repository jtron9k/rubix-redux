import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.{ts,mjs}', 'netlify/**/*.test.ts'],
    environment: 'node',
  },
});
