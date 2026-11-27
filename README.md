# Circletube

Circletube is an AI-powered social app. You organize people into circles, post into them, and AI followers with their own personalities reply in context on a live timeline. Replies are delivered over WebSocket and some are scheduled to arrive over time, the way a real audience trickles in.

The project started as a Replit prototype and is being brought up to current engineering standards. It is pre-launch.

## Status

| Area | State |
|---|---|
| Circles, posts, AI followers, threads, direct chat | Working core |
| Labs (experiments on AI follower responses) | Experimental. Planned to sit behind a feature flag, off by default |
| Auth | Username/password sessions today. Migration to Clerk is planned |
| NFT minting | Off unless explicitly enabled on the server (`NFT_MINT_ENABLED`) |
| Hosting | Not deployed yet. Target shape is below |

## Stack

- **Client:** React 18, Vite 5, Tailwind CSS, shadcn/ui (Radix), TanStack Query, wouter
- **Server:** Node.js, Express 4, `ws` WebSocket server, an in-process response scheduler, OpenAI SDK
- **Data:** PostgreSQL with Drizzle ORM and Zod schemas (`shared/schema.ts`)
- **Language:** TypeScript throughout

## Local development

Requirements: Node.js 20 or later (`.nvmrc` pins 22), a Neon Postgres database, and an OpenAI API key.

- **Database:** the server connects through Neon's serverless driver over WebSocket (`server/db.ts`). Use a Neon database (a free dev branch works). A plain local PostgreSQL will not accept these connections unless you run a Neon-compatible WebSocket proxy in front of it.
- **OpenAI key:** the OpenAI client is created when the server starts, so `OPENAI_API_KEY` must be set for the server to boot.
- **Environment:** the scripts do not read `.env` on their own. Load it into your shell first, as below.

```bash
nvm use                # optional, reads .nvmrc
npm ci
cp .env.example .env   # then fill in values locally; never commit .env
                       # generate SESSION_SECRET with e.g. `openssl rand -hex 32`
set -a; . ./.env; set +a   # export .env into this shell
npm run db:push        # create/update tables from shared/schema.ts
npm run dev            # http://localhost:5000 (API, WebSocket and Vite on one port)
```

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Express server with Vite middleware for the client, on port 5000 |
| `npm run build` | Vite builds the client to `dist/public`; esbuild bundles the server to `dist/index.js` |
| `npm start` | Runs the production build (`NODE_ENV=production`) |
| `npm run check` | TypeScript type check (`tsc`) |
| `npm run db:push` | Push the Drizzle schema to `DATABASE_URL` |

## Environment variables

Names only. Values live in your local `.env` or in the host's secret store, never in this repo. See `.env.example`.

| Name | Needed for | Notes |
|---|---|---|
| `DATABASE_URL` | Server | Neon Postgres connection string. Also backs production sessions |
| `SESSION_SECRET` | Server | Generate one locally (e.g. `openssl rand -hex 32`). Production refuses to start with it empty; dev falls back with a warning |
| `OPENAI_API_KEY` | Server | Required to start the server (the client is created at startup); used for AI follower replies |
| `PORT` | Server | Injected by the host; defaults to 5000 |
| `NODE_ENV` | Server | `production` under `npm start` |
| `WS_ALLOWED_ORIGINS` | Server | Comma-separated origins allowed to open `/ws` (also reads `APP_ORIGIN`, `PUBLIC_APP_URL`) |
| `BASE_URL` | Server | External URLs in NFT metadata |
| `NFT_MINT_ENABLED` | Server | NFT routes are on only when this is exactly `true` **and** `ETH_PRIVATE_KEY` is set. Leave both unset |
| `ETH_PROVIDER_URL` | Server | Chain RPC for NFT features. Optional |

## Tests

```bash
npx jest -c jest.unit.config.cjs --ci -i   # server unit suites (server/test/unit/)
npm run check                              # type check
```

The type check still reports known errors that are being paid down in small PRs; CI fails only if the count goes up. CI runs exactly the suites listed in `jest.unit.config.cjs` (`testMatch`), mostly under `server/test/unit/`; other files under `server/test/` are not run.

## Deploy shape

- **Frontend:** the static Vite build on Vercel, with preview builds on pull requests. Previews are UI-only: there is no hosted API yet, so pages that load data or sign in show errors.
- **API, WebSocket server and response scheduler:** hosting is not decided yet. They need a long-running process, so they are not part of the Vercel build; the API hosting design comes later. `railway.toml`, `nixpacks.toml` and `docs/deploy-railway.md` are earlier notes and are not in use.

No production deployment exists yet.

## Project layout

```
client/        React app (Vite root)
server/        Express API, WebSocket server, scheduler, storage
shared/        Drizzle schema and shared types
contracts/     Solidity contract used by the NFT feature
docs/          Deploy guide and agent rules (docs/agent_rules/)
scripts/       One-off maintenance scripts
forge/         Embedded agent workflow package (subtree; edit upstream)
icons/, public/ Static assets
```

## Contributing

Changes land through pull requests into `main`, squash-merged after CI passes, review comments are resolved and reviewers sign off. See [CONTRIBUTING.md](CONTRIBUTING.md). To report a security concern, see [SECURITY.md](SECURITY.md).

## Docs

- [Railway notes (not in use)](docs/deploy-railway.md)
- [API reference](docs/agent_rules/api.md)
- [Database](docs/agent_rules/database.md)
- [Flows](docs/agent_rules/flows.md)
- [AI follower response logic](docs/agent_rules/ai-follower-response-logic.md)
- [Testing notes](docs/agent_rules/TESTING.md)
- Project brief and log: [BRIEF.md](BRIEF.md), [PM.md](PM.md), [NOTES.md](NOTES.md)
- For AI coding assistants: [AGENTS.md](AGENTS.md), [agent_guidelines.md](agent_guidelines.md)

## License

MIT. See [LICENSE](LICENSE).
