// Jest test setup file
import { jest } from '@jest/globals';

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';

// Mock console.error in tests to keep output clean
const originalError = console.error;
console.error = (...args) => {
  if (args[0]?.includes('DeprecationWarning')) return;
  originalError.apply(console, args);
};

// Global test timeout
jest.setTimeout(10000);

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Reset modules after each test
afterEach(() => {
  jest.resetModules();
});
