# Circletube on Railway

Realtime needs one long-lived Node process: WebSocket `/ws` plus in-process
`ResponseScheduler`. Vercel-only (`vercel.json`) cannot carry that loop.
This repo is **Railway-ready in source**; there is **no Circletube Railway
project yet**. BRIEF.md’s open question — which project/URL is canonical —
stays open until a human creates the service. Do not treat any URL as
production until that happens.

## Create a service from this repo

1. In Railway, create a **new project** and a **new service** from GitHub
   `shaiss/circletube` (branch `main` after this scaffold merges).
2. Leave the builder as **Railpack** (Railway's default). **New services do
   not apply `railway.toml`** — Railway deprecated Config as Code for new
   projects/services ([docs](https://docs.railway.com/config-as-code)); you
   must set build and deploy in the **service dashboard**:
   - **Build command:** `npm run build`
   - **Start command:** `npm start`
   - **Health check path:** `/api/health`
   - **Restart policy:** On failure (`ON_FAILURE`, same as `railway.toml`
     `[deploy].restartPolicyType`)
   `package.json` `engines.node` is `>=20`; Railpack resolves Node LTS.
3. If an operator later selects **Nixpacks** in the dashboard, `nixpacks.toml`
   applies (Node 22, the same build, and the same start command). Prefer Railpack.
4. Do **not** add a Dockerfile unless Railpack/Nixpacks cannot build.
5. Set env vars in the Railway dashboard (names only below — never commit
   values). Provision Postgres (or Neon) separately and put its URL in
   `DATABASE_URL`. Run schema push from a trusted machine:
   `npm run db:push` (Drizzle only; do not edit tables by hand).
6. Generate a public HTTPS domain on the service. Record that URL as the
   canonical host in BRIEF/NOTES in a later session — not before it exists.

### `railway.toml` (deprecated Config as Code)

`railway.toml` in this repo mirrors the dashboard values above for
documentation. It **does not** configure a newly created Circletube service.
Services that **already** used Config as Code keep honoring the file until
**2026-12-01** (hard cutoff). Migrating to `.railway/railway.ts` IaC is out of
scope for this scaffold.

`npm start` is `NODE_ENV=production node dist/index.js`. Vite writes the
client to `dist/public`; esbuild writes the server to `dist/index.js`.
Production static serving reads `dist/public`. The process listens on
`Number(process.env.PORT) || 5000` at `0.0.0.0`.

## Required env var names (no values)

| Name | Why |
|---|---|
| `DATABASE_URL` | Postgres connection. `server/db.ts` throws if unset. Drizzle + Neon serverless pool. |
| `SESSION_SECRET` | Passport/express-session cookie signing. Dev falls back to a plaintext default; production must set this. |
| `OPENAI_API_KEY` | AI follower replies (`server/openai.ts`, scheduler, some routes). Process can boot without it; replies will fail. |

`PORT` is injected by Railway — do not set it in the dashboard unless you
know you need to.

## Optional env var names already read by the server

| Name | Why |
|---|---|
| `NODE_ENV` | Set to `production` by `npm start`. Enables `trust proxy` and secure cookies. |
| `JWT_SECRET` | Alternate WebSocket auth token verify; falls back if unset. |
| `BASE_URL` | NFT metadata / external URLs (`server/blockchain/`). |
| `ETH_PROVIDER_URL` | Chain RPC; defaults to a public Sepolia Base URL. |
| `ETH_PRIVATE_KEY` | Contract writes; empty means those paths cannot sign. |

Sessions today use **in-memory** `memorystore` (`server/sessionStore.ts`),
not `connect-pg-simple` (that package is unused). `DATABASE_URL` is still
required for app data. Restarts drop login cookies until a Postgres session
store is wired.

## Health / smoke (after a human deploys)

- Process stays up: Railway deploy running, logs show `serving on port …`
  (the injected `PORT`).
- HTTP: `GET /api/health` returns `{ status: "ok" }` (health check path from
  step 2).
- WebSocket: client upgrade to `wss://<host>/ws` (see
  `server/websocket.ts`). Scheduler ticks only while this process is alive.
- Not a merge gate (F4): no CI workflow is added by this scaffold.

## Out of scope here

Creating the Railway project, writing secrets, provisioning the database,
and claiming a canonical URL. Admiral merges; agents never merge.
