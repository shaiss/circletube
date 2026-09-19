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
| Deploy target that can host a long-lived Node process (WS + scheduler) | Given | Runtime reality — **Railway (or equivalent) required**; Vercel-only will not carry WS/scheduler |
| Merge / deploy gate (build → deploy → boot → smoke) | Assumed deferred | F4: no gate runners at embed; honest baseline below |

## Stack

- **Client:** React + TypeScript, Vite, Tailwind/Shadcn, TanStack Query, Wouter, WebSocket client
- **Server:** Express + TypeScript, Passport.js, `ws` WebSocket server, `ResponseScheduler`
- **Data:** PostgreSQL, Drizzle ORM, Zod validation (`shared/`)
- **Contracts:** Solidity under `contracts/` (OpenZeppelin)
- **Agent conventions:** `docs/agent_rules/` (API, database, flows, testing) — cite; do not duplicate
- **Deploy:** long-lived Node host required for realtime. **Railway/WS required for realtime — Vercel-only will not carry WS/scheduler** (`vercel.json` exists for static/API experiments; it is not a substitute for the WS + scheduler process)

## Module breakdown

| Module | What it does | Coupon (risky seam to prove first) |
|---|---|---|
| Auth / sessions | Passport-local login, session store | Cookie session survives deploy + WS upgrade |
| Circles / posts | Circle CRUD, posts, categories | Lab- vs circle-scoped content queries |
| AI followers | Personas, mute/active, NFT link | OpenAI reply path with thread context |
| WebSocket | `/ws` live updates to clients | Upgrade + broadcast on Railway (not Vercel serverless) |
| ResponseScheduler | Delayed/probabilistic follower replies | Scheduler ticks while process stays up |
| Contracts | On-chain follower NFT | Deploy/read against a test network |

## Assumptions & defaults

- Solo operator is admiral (human lead); public multi-tenant auth is out of charter until declared.
- `npm run check` (`tsc`) is the only package script gate today.
- Server Jest suite lives under `.archive-server-tests/` (and a residual `server/test/` tree) — **archived / not the running gate**.
- No CI workflows, gate runners, skills automation, autonomy routines, or `forger-init` added at embed (F4).
- Realtime correctness requires a process host (Railway or equivalent), not Vercel-only.

## Open questions

**Blocks scaffolding of a real gate**

- Which Railway (or other long-lived) service is the canonical deploy target for WS + `ResponseScheduler`?

**May proceed on stated assumption**

- Gate contract remains unbuilt until a session is blocked without it (F4); baseline is `check: tsc` + archived server tests.
- How far `contracts/` must go for v1 vs mock/off-chain follower IDs.

## Done-test

A cold session can start from this brief alone: stack and deploy constraint are named, agent rules and contracts are cited, and the no-gate baseline (`check: tsc` / archived server tests) is honest. Gaps above are Open questions, not silent holes.
