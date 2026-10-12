import session, { type Store } from "express-session";
import connectPgSimple from "connect-pg-simple";
import memorystore from "memorystore";

const MemoryStore = memorystore(session);
const PgStore = connectPgSimple(session);

/**
 * Production uses Postgres (connect-pg-simple + DATABASE_URL) so Railway
 * restarts keep logins. Local/dev keeps the in-memory store for an easy path.
 * SESSION_SECRET fail-fast in production is unchanged (see sessionSecret.ts).
 */
function createSessionStore(): Store {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL must be set for the production session store.",
      );
    }

    return new PgStore({
      conString: databaseUrl,
      // Creates the default "session" table on first use if missing.
      // Schema: node_modules/connect-pg-simple/table.sql
      createTableIfMissing: true,
    });
  }

  return new MemoryStore({
    checkPeriod: 60 * 60 * 1000, // Prune expired entries every hour
  });
}

export const sessionStore = createSessionStore();

// Helper function to get session from store
export const getSession = (sid: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    sessionStore.get(sid, (err, session) => {
      if (err) reject(err);
      else resolve(session);
    });
  });
};
