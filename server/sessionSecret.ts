const DEV_SESSION_SECRET_FALLBACK = "development_secret";

/**
 * Cookie-signing secret for express-session.
 * Production (NODE_ENV=production) requires SESSION_SECRET; local/dev may fall back.
 */
export function resolveSessionSecret(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  sessionSecret: string | undefined = process.env.SESSION_SECRET,
): string {
  const isProduction = nodeEnv === "production";
  const secret = sessionSecret?.trim() ?? "";

  if (isProduction) {
    if (!secret) {
      throw new Error(
        "SESSION_SECRET is required in production. Set a non-empty SESSION_SECRET before starting the server.",
      );
    }
    return secret;
  }

  if (!secret) {
    console.warn(
      "SESSION_SECRET is unset; using a development-only fallback. Set SESSION_SECRET before deploying to production.",
    );
    return DEV_SESSION_SECRET_FALLBACK;
  }

  return secret;
}
