import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  // Indicates that each test environment is a browser-like environment
  testEnvironment: 'jsdom',

  // A list of paths to modules that run some code to configure or set up testing framework before each test
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],

  // The preset is a base configuration that Jest uses
  preset: 'ts-jest',

  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured soon)
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Added so Jest knows how to transform TypeScript files
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};

export default config;
