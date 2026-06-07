/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/e2e'],
  testMatch: ['**/*.e2e.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@syncsaga/shared$': '<rootDir>/../../../packages/shared/src/index.ts',
  },
  testTimeout: 30000,
  verbose: true,
};
