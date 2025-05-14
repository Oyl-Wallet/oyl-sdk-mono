import type { Config } from 'jest'

const config: Config = {
  projects: ['<rootDir>/packages/*/jest.config.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@oyl-sdk/(.*)$': '<rootDir>/packages/$1/src',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@oyl-sdk)/)'
  ],
}

export default config
