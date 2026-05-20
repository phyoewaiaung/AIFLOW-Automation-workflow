import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@autoflow/configs$': '<rootDir>/../../../packages/configs/src',
    '^@autoflow/types$': '<rootDir>/../../../packages/types/src',
    '^@autoflow/utils$': '<rootDir>/../../../packages/utils/src',
  },
};

export default config;
