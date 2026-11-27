# Circletube frontend on Vercel

Vercel hosts only the static client. The API, the `/ws` WebSocket server and
the response scheduler need a long-running process and are not part of this
build. Where they will be hosted is not decided yet; that design comes later.

## What `vercel.json` does

- Installs with `npm ci` and builds only the Vite client (`npx vite build`)
  into `dist/public`. The server bundle is not built or deployed on Vercel.
- Serves `index.html` for client routes (single-page app fallback).
  `/api`, `/ws`, `/assets` and every path under them (such as `/api/x`,
  `/ws/x` or a missing `/assets/x.js`) are not rewritten, so they return 404
  on Vercel instead of `index.html`.
- Adds response headers: no framing, no plugins, same-origin base URL,
  `nosniff` and a strict referrer policy. It sets no custom caching: files
  under `/assets` use Vercel's default caching until there is a production
  deploy decision.
- Defines no functions and no environment variables. Vercel holds no server
  secrets.
- Turns off Git-triggered deployments from `main`
  (`git.deploymentEnabled`). Pull request and other branch previews still
  build.

## Preview deployments

Each pull request gets a preview build once the Vercel project is linked to
this repository.

**Previews serve only `/auth` and other public routes for now.** There is no
hosted API yet, so `/api` requests return 404. Because `/api/user` returns
404, the app sees no signed-in user and every protected route redirects to
`/auth`.
Use previews to review `/auth` and other public pages. This is intended until
the API hosting design lands; it will add whatever routing the API needs.

Previews must never point at the production database, and only `VITE_*`
(public, build-time) values belong in Vercel's environment settings.

## Production

Production deployments are disabled on the Vercel project. Turning them on is
a separate owner decision (it would be the first public deploy) and needs the
API hosting design first, since the same `/api` limitation applies.

`git.deploymentEnabled` in `vercel.json` stops Git-triggered deployments from
`main` only. The Vercel CLI (`vercel --prod`) and the Vercel API can still
deploy. The project's Ignored Build Step setting stays in place as a second
check for Git-triggered builds; it is not guaranteed to apply to a deploy
started from the CLI with `--prod`.

Keeping the first production deploy a deliberate, approved step is a team
process rule. Neither `git.deploymentEnabled` nor the Ignored Build Step
enforces it.

## Setup (maintainers)

Linking the Vercel project, turning on pull request previews, protecting
previews with Vercel Authentication and keeping production disabled are done
in the Vercel dashboard by a maintainer.
