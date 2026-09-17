import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Resolves the "@/*" alias from tsconfig.json natively.
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
  },
});
