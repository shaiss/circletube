/** @type {import('jest').Config} */
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  clearMocks: true,
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // Route modules on main carry pre-existing tsc debt; unit tests
        // still exercise runtime behavior without typechecking the whole tree.
        diagnostics: false,
        isolatedModules: true,
        tsconfig: {
          module: 'commonjs',
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          allowImportingTsExtensions: false,
          resolveJsonModule: true,
          types: ['node', 'jest'],
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../../../shared/$1',
  },
};
