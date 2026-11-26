/** Minimal Jest config for server unit smoke tests. */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/server"],
  testMatch: [
    "<rootDir>/server/test/simple.test.ts",
    "<rootDir>/server/sanitizeUser.test.ts",
    "<rootDir>/server/test/unit/direct-chat-owner-scope.test.ts",
    "<rootDir>/server/test/unit/follower-owner-scope.test.ts",
    "<rootDir>/server/test/unit/direct-chat-ai-args.test.ts",
    "<rootDir>/server/test/unit/generate-ai-response-history.test.ts",
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
