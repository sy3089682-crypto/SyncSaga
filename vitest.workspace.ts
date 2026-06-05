import { defineWorkspace } from 'vitest/config';
import path from 'path';

export default defineWorkspace([
  {
    test: {
      name: 'api',
      root: './apps/api',
      globals: true,
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: [],
      testTimeout: 10000,
      hookTimeout: 10000,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        reportsDirectory: '../../coverage/api',
        include: ['src/**/*.ts'],
        exclude: [
          'src/**/*.test.ts',
          'src/**/*.spec.ts',
          'src/**/__tests__/**',
          'src/**/*.d.ts',
        ],
        thresholds: {
          statements: 40,
          branches: 30,
          functions: 40,
          lines: 40,
        },
      },
    },
    resolve: {
      alias: {
        '@syncsaga/types': path.resolve(__dirname, './packages/types'),
        '@syncsaga/config': path.resolve(__dirname, './packages/config/src'),
      },
    },
  },
  {
    test: {
      name: 'web',
      root: './apps/web',
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        reportsDirectory: '../../coverage/web',
        include: ['src/**/*.ts', 'src/**/*.tsx'],
        exclude: [
          'src/**/*.test.ts',
          'src/**/*.test.tsx',
          'src/**/*.spec.ts',
          'src/**/__tests__/**',
          'src/**/*.d.ts',
        ],
        thresholds: {
          statements: 40,
          branches: 30,
          functions: 40,
          lines: 40,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './apps/web/src'),
        '@syncsaga/types': path.resolve(__dirname, './packages/types'),
      },
    },
  },
  {
    test: {
      name: 'shared',
      root: './packages/shared',
      globals: true,
      environment: 'node',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        reportsDirectory: '../../coverage/shared',
        include: ['src/**/*.ts'],
        exclude: [
          'src/**/*.test.ts',
          'src/**/*.spec.ts',
          'src/**/__tests__/**',
          'src/**/*.d.ts',
        ],
        thresholds: {
          statements: 40,
          branches: 30,
          functions: 40,
          lines: 40,
        },
      },
    },
  },
]);
