# Circletube — app brief

## What it is

Circletube is an AI-powered social platform: the solo operator runs
categorized circles where human posts meet AI-generated followers that
respond in context on a live timeline. The **first user** is admiral
(solo operator / human lead) who needs AI followers to react to posts on
a real timeline with WebSocket delivery and scheduled responses — not a
static mock feed. Circe is the PM agent who owns the charter (`PM.md`),
not the first user.

## Requirements

| Requirement | Given / assumed | Source |
|---|---|---|
| Circles with categories, access control, member management | Given | `README.md`; `docs/agent_rules/` |
| AI followers with personalities; context-aware thread replies | Given | `docs/agent_rules/ai-follower-response-logic.md`, `flows.md` |
| Passport-local auth and session cookies | Given | `server/` Passport setup; `docs/agent_rules/api.md` |
| Postgres data model via Drizzle + Zod | Given | `shared/`; `docs/agent_rules/database.md` |
| Realtime over WebSocket (`/ws`) plus in-process `ResponseScheduler` | Given | `server/websocket.ts`, `server/response-scheduler.ts` |
| NFT / on-chain follower identity under `contracts/` | Given | `contracts/AIFollowerNFT.sol` (present) |
| Deploy target that can host a long-lived Node process (WS + scheduler) | Given | Runtime reality — a long-lived Node host is required (not decided yet); the Vercel frontend build does not carry WS/scheduler |
| Merge / deploy gate (build → deploy → boot → smoke) | Assumed deferred | F4: no gate runners at embed; honest baseline below |

## Stack

- **Client:** React + TypeScript, Vite, Tailwind/Shadcn, TanStack Query, Wouter, WebSocket client
- **Server:** Express + TypeScript, Passport.js, `ws` WebSocket server, `ResponseScheduler`
- **Data:** PostgreSQL, Drizzle ORM, Zod validation (`shared/`)
- **Contracts:** Solidity under `contracts/` (OpenZeppelin)
- **Agent conventions:** `docs/agent_rules/` (API, database, flows, testing) — cite; do not duplicate
- **Deploy:** the static client builds on Vercel (`vercel.json`, previews only; see `docs/deploy-vercel.md`). Realtime needs a long-lived Node host for `/ws` and the scheduler; that host is not decided yet.

## Module breakdown

| Module | What it does | Coupon (risky seam to prove first) |
|---|---|---|
| Auth / sessions | Passport-local login, session store | Cookie session survives deploy + WS upgrade |
| Circles / posts | Circle CRUD, posts, categories | Lab- vs circle-scoped content queries |
| AI followers | Personas, mute/active, NFT link | OpenAI reply path with thread context |
| WebSocket | `/ws` live updates to clients | Upgrade + broadcast on a long-lived host (not Vercel) |
| ResponseScheduler | Delayed/probabilistic follower replies | Scheduler ticks while process stays up |
| Contracts | On-chain follower NFT | Deploy/read against a test network |

## Assumptions & defaults

- Solo operator is admiral (human lead); public multi-tenant auth is out of charter until declared.
- CI (`.github/workflows/ci.yml`) runs the type check (the error count may not rise above the baseline), build, unit tests and a secret scan; `CI OK` is the required check on `main`.
- Unit tests run with `npx jest -c jest.unit.config.cjs` (the suites listed in its `testMatch`). The old archived server suites were removed in the 2026-11-27 repo cleanup (see git history).
- No gate runners, skills automation, autonomy routines, or `forger-init` added at embed (F4). CI was added later (2026-11-27).
- Realtime correctness requires a long-lived process host, not Vercel.

## Open questions

**Blocks scaffolding of a real gate**

- Which long-lived host is the canonical deploy target for WS + `ResponseScheduler`?

**May proceed on stated assumption**

- Gate contract remains unbuilt until a session is blocked without it (F4); baseline is `check: tsc` + the unit suites in `jest.unit.config.cjs`.
- How far `contracts/` must go for v1 vs mock/off-chain follower IDs.

## Done-test

A cold session can start from this brief alone: stack and deploy constraint are named, agent rules and contracts are cited, and the baseline (`check: tsc` / unit suites in `jest.unit.config.cjs`) is honest. Gaps above are Open questions, not silent holes.
