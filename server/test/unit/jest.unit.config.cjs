/** Minimal Jest config for server/test/unit/*.test.ts */
module.exports = {
  rootDir: '../../..',
  testEnvironment: 'node',
  testMatch: ['**/server/test/unit/**/*.test.ts'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: false,
        isolatedModules: true,
        tsconfig: {
          module: 'commonjs',
          esModuleInterop: true,
          strict: false,
          skipLibCheck: true,
          types: ['jest', 'node'],
          baseUrl: '.',
          paths: { '@shared/*': ['./shared/*'] },
        },
      },
    ],
  },
  forceExit: true,
};
