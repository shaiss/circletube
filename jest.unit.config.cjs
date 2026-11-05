/**
 * Minimal Jest config for focused server unit tests.
 */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/server/test/unit/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // storage.ts has many pre-existing type errors on main; transpile only.
        diagnostics: false,
        isolatedModules: true,
        tsconfig: {
          module: "commonjs",
          esModuleInterop: true,
          strict: false,
          skipLibCheck: true,
          baseUrl: ".",
          types: ["jest", "node"],
          paths: {
            "@shared/*": ["./shared/*"],
          },
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@shared/(.*)$": "<rootDir>/shared/$1",
  },
  testTimeout: 10000,
  verbose: true,
};
