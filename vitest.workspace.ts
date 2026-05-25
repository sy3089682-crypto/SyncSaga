import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'api',
      root: './apps/api',
      globals: true,
      environment: 'node',
    },
  },
  {
    test: {
      name: 'web',
      root: './apps/web',
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  },
  {
    test: {
      name: 'shared',
      root: './packages/shared',
      globals: true,
      environment: 'node',
    },
  },
]);
