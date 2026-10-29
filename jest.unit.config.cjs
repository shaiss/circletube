/** Minimal Jest config for server unit smoke tests. */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/server"],
  testMatch: [
    "<rootDir>/server/test/simple.test.ts",
    "<rootDir>/server/sanitizeUser.test.ts",
  ],
  moduleNameMapper: {
    "^@shared/(.*)$": "<rootDir>/shared/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        diagnostics: false,
        tsconfig: {
          module: "commonjs",
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          types: ["jest", "node"],
          baseUrl: ".",
          paths: {
            "@shared/*": ["./shared/*"],
          },
        },
      },
    ],
  },
};
