# Circletube — engineering log

## How to resume

- Product page: root `README.md` (existing — do not fight it; forge template absorbed by pointer only).
- Brief / charter: `BRIEF.md`, `PM.md`. Field convention: `FIELD-TEST.md`.
- Machine: `forge/` (public-safe embed). Lineage: root `forge.conf`.
- Agent rules: `docs/agent_rules/` via `AGENTS.md`.
- Confirm state: `npm run check` (`tsc`). Server tests are archived (`.archive-server-tests/`); not a green gate.
- Realtime needs Railway (or equivalent) + WS; Vercel-only will not carry the scheduler. In-repo scaffold: `docs/deploy-railway.md`. Canonical Railway project/URL is still unset.

## Log

### 2026-10-04 — Railway process-host scaffold (B1 config)
- **Did:** Listen port honors `process.env.PORT` with 5000 fallback on `0.0.0.0`; dropped `reusePort` and the 5001 fallback (would miss Railway's proxy). Added `railway.toml` (Railpack: `npm run build` / `npm start`, healthcheck `/api/health`) and `nixpacks.toml` fallback (Node 22). Documented create-service steps and env **names** in `docs/deploy-railway.md`. `engines.node` is `>=20`. Did not create a Railway project, commit secrets, or add CI.
- **Decided (and why):** Charter N1/B1 — Vercel-only cannot host `/ws` + `ResponseScheduler`. Railpack is Railway's current builder; Nixpacks file is only a fallback. Sessions remain in-memory (`memorystore`); `DATABASE_URL` is still required by `server/db.ts`.
- **Left for next session:** A human must create the Railway service, set env values, provision Postgres, and record the canonical URL. BRIEF open question unchanged until then.

### 2026-09-20 — product-name scrub
- **Did:** Replaced the retired product name with Circletube in UI copy, live `docs/agent_rules/`, README, the forge brief template, and the NFT fallback host. Charter N6 now says Circletube is the sole public name.
- **Decided (and why):** Admiral ask — the old name is retired, not internal-only.
- **Left for next session:** Historical filenames under `attached_assets/` and `.archive-*` dumps were not renamed.

### 2026-09-19 — forger public-safe embed
- **Did:** `git subtree add --prefix forge` from `shaiss/forger` branch `embed/public-safe-package` (Cipher RE-CLEAR tip `d9379e1006795681f357884c7d6f3773be5da4d4`, squash). Init copied templates to `BRIEF.md`, `PM.md`, `NOTES.md`, `FIELD-TEST.md`; wrote root `forge.conf`; one-line `AGENTS.md` route to `forge/`. Did not overwrite product `README.md`.
- **Decided (and why):** Package-only embed (no `people/`); F4 — no CI, gate runners, skills, autonomy, or `forger-init`. Brief states Railway/WS required for realtime.
- **Left for next session:** Pick canonical long-lived deploy; earn gate only when a session is blocked without it.

## Field test log

_Real usage of the deployed project, newest at the bottom. Entry format in
[FIELD-TEST.md](FIELD-TEST.md)._
