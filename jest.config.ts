import type { Config } from 'jest'

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.(spec|test).[jt]s?(x)'],
}

export default config
