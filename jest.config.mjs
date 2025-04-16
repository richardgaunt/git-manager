export default {
  // Support ES Modules
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Test environment
  testEnvironment: 'node',
  // File extensions to test
  testMatch: ['**/tests/**/*.test.mjs'],
  // Coverage settings
  collectCoverageFrom: [
    '**/*.mjs',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**',
    '!**/jest.config.mjs',
  ],
  // Path to look for tests
  roots: ['<rootDir>/tests/'],
};