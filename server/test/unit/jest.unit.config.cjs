/** @type {import('jest').Config} */
module.exports = {
  rootDir: "../../..",
  testEnvironment: "node",
  testMatch: ["<rootDir>/server/test/unit/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // shared/schema.ts has a known ai_followers self-ref circular type (tsc debt on main).
        diagnostics: { ignoreCodes: [7022, 7024] },
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          types: ["jest", "node"],
          baseUrl: ".",
          paths: {
            "@shared/*": ["shared/*"],
          },
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@shared/(.*)$": "<rootDir>/shared/$1",
  },
  clearMocks: true,
  testTimeout: 15000,
};
