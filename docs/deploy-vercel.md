# Circletube frontend on Vercel

Vercel hosts only the static client. The API, the `/ws` WebSocket server and
the response scheduler need a long-running Node process and run on Railway
(see `deploy-railway.md`).

## What `vercel.json` does

- Installs with `npm ci` and builds only the Vite client (`npx vite build`)
  into `dist/public`. The server bundle is not built or deployed on Vercel.
- Serves `index.html` for client routes (single-page app fallback). Paths
  under `/api` and `/ws` are not rewritten, so they return 404 on Vercel.
- Adds response headers: no framing, no plugins, same-origin base URL,
  `nosniff`, a strict referrer policy, and long caching for hashed assets.
- Defines no functions and no environment variables. Vercel holds no server
  secrets.

## Preview deployments

Each pull request gets a preview build once the Vercel project is linked to
this repository.

**Previews are UI-only for now.** There is no non-production API yet, so
pages that load data or sign in will show errors in a preview. Use previews
for layout and visual review.

When a non-production (staging) API exists on Railway, previews can reach it
by proxying `/api` with a Vercel rewrite to the staging host, so requests stay
same-origin. The WebSocket connection would need a separate, build-time
`VITE_*` URL because Vercel rewrites do not carry WebSocket upgrades. Previews
must never point at the production database, and only `VITE_*` (public,
build-time) values belong in Vercel's environment settings.

## Setup (maintainers)

Linking the Vercel project, turning on pull request previews and choosing
preview access protection are done in the Vercel dashboard by a maintainer.
