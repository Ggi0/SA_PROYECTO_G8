/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },

  collectCoverage: true,

  collectCoverageFrom: [
    'src/**/*service.ts',
    'src/**/*controller.ts',
  ],

  coverageDirectory: 'coverage',
  testEnvironment: 'node',

  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
};