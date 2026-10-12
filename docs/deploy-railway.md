# Circletube on Railway — sessions and env

Long-lived Node on Railway (`npm start`, `NODE_ENV=production`) must keep
logins across restarts. This page documents the durable session store and the
env **names** operators set in the Railway dashboard. Never commit secret
values. Do **not** create the Railway project or write production secrets from
an agent session.

For the broader Railway service scaffold (build/start/healthcheck), see open
PR discussion / `railway.toml` when that scaffold lands on `main`.

## Required env var names (no values)

| Name | Why |
|---|---|
| `DATABASE_URL` | Postgres for app data (`server/db.ts`) and for the production session store (`connect-pg-simple` in `server/sessionStore.ts`). |
| `SESSION_SECRET` | Cookie signing for express-session. **Required in production** (fail-fast from #11 / `server/sessionSecret.ts`). Local/dev may omit and get a plaintext fallback with a warning. |
| `OPENAI_API_KEY` | AI follower replies; process can boot without it, replies will fail. |

`PORT` is injected by Railway. `NODE_ENV=production` is set by `npm start`.

## Session store

| Environment | Store | Behavior |
|---|---|---|
| Production (`NODE_ENV=production`) | `connect-pg-simple` on `DATABASE_URL` | Sessions survive process restarts/redeploys |
| Local / dev (`npm run dev`) | in-memory `memorystore` | Easy local path; restarts drop sessions |

### Table / migration

On first production use, `connect-pg-simple` creates the default `session`
table if it is missing (`createTableIfMissing: true`). Schema matches
`node_modules/connect-pg-simple/table.sql`:

- `sid` (varchar, PK)
- `sess` (json)
- `expire` (timestamp)

This table is **not** managed by Drizzle. Continue to use `npm run db:push`
for application schema only. Operators who prefer an explicit DDL step can
run `table.sql` against the same database before boot.

### Fail-fast (unchanged)

- Missing `SESSION_SECRET` in production still throws at startup.
- Missing `DATABASE_URL` in production throws when creating the Postgres
  session store (and earlier from `server/db.ts` for app data).

## Out of scope

Creating the Railway project, setting secret values, WebSocket auth across
deploys, and scheduler shutdown on redeploy.
