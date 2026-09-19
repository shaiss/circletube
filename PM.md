# Circletube (Agapi) — product charter

## The product, in one paragraph

Circletube (Agapi) is an agentic social app: circles of posts where AI
followers engage in realtime. It must do one thing well — keep a live,
context-aware follower response loop running for the operator's circles.
**Customer:** Circe — Circletube / Agapi internal operator (single-operator
default).

## Non-negotiables

| # | Constraint | Source | Reopens if | Enforced by |
|---|---|---|---|---|
| N1 | Realtime path needs a long-lived Node process (WebSocket + ResponseScheduler); Vercel-only is not enough | BRIEF.md; `server/websocket.ts`, `server/response-scheduler.ts` | A proven host runs WS + scheduler without a persistent process | Manual / deploy review (no gate yet) |
| N2 | Agent conventions stay in `docs/agent_rules/`; do not duplicate into forge | `AGENTS.md`; embed route-don't-duplicate | Those docs move or split | Review |
| N3 | No CI / gate runners / forger-init at embed (F4) | forge package; Cipher RE-CLEAR embed | A real session is blocked without machinery | Review |
| N4 | Database changes go through Drizzle only | `docs/agent_rules/database.md` | ORM replaced | Review |

## Out of scope

**Deferred** — ranked backlog below.

**Never**

- Embedding forger `main` or private tip into this public repo
- Shipping secrets, PII, or personal profiles via forge backflow
- Treating Vercel serverless alone as the realtime production host

## v1 — definition of done

- [ ] Operator can run circles with AI follower replies on a Railway (or equivalent) deploy with working `/ws`
- [ ] Brief, charter, and NOTES stay accurate for a cold session
- [ ] Honest gate baseline documented until a real gate is earned

## Backlog, ranked by user value

| # | Item | Why this rank | Cost |
|---|---|---|---|
| B1 | Canonical Railway (or equivalent) deploy for WS + scheduler | Unblocks realtime truth | Deploy surface |
| B2 | Earn a real merge gate from the F4 baseline | Sessions need a checkable bar | CI + smoke |
| B3 | Lab- vs circle-scoped content correctness | Known product bugs | Query + UI |

## Open decisions

| Question | Blocking? | Assumption if unanswered |
|---|---|---|
| Canonical long-lived host URL / service | Soft-blocks prod claims | Local `npm run dev` for development |
| When to un-archive server tests into a gate | No | Keep `check: tsc` only |

## Decision log

| Date | Decision | Reason |
|---|---|---|
| 2026-09-19 | Embed Cipher RE-CLEARED `embed/public-safe-package` @ `d9379e1006795681f357884c7d6f3773be5da4d4` under `forge/` | Public-safe package only; F4 no CI |
| 2026-09-19 | Charter customer named Circe (internal operator) | Single-operator default for project #1 |
