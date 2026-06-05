import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: [],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@syncsaga/types': path.resolve(__dirname, '../../packages/types'),
      '@syncsaga/config': path.resolve(__dirname, '../../packages/config/src'),
    },
  },
});
