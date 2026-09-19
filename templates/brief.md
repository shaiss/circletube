<!-- The app-brief format — the input contract of a build. forger lays this
     down when it embeds; a human (or a scheduled session) fills it, and a
     later session picks it up COLD and starts building. Everything the first
     session needs — the first user, what's decided vs guessed, the stack, the
     risky couplings — lives here or in Open questions. The done-test at the
     bottom is the bar this file must clear. Stack-agnostic: the examples are
     circletube (an agentic social app, TypeScript) and are examples, not
     defaults. Delete these comments. -->

## What it is

One paragraph: what the app does, who the **first user** is by name/role,
and the one job they hire it for. If you cannot name that user and their
job, the idea is not ready to brief.

<!-- e.g. "A solo operator running an agentic social feed (Agapi) who needs
     AI followers to react to posts on a real timeline." -->

## Requirements

What the app must do. Every row is either **given** (decided, with a
source — a person, a doc, a constraint that already exists) or **assumed**
(a stated default a session may challenge). A requirement nobody can
supply yet is not a guess — move it to Open questions.

| Requirement | Given / assumed | Source |
|---|---|---|
| | | |

## Stack

The stack is decided here, up front (forger core is stack-agnostic — the
project commits its own; D4). Name the language, framework(s), datastore,
and deploy target. Deciding here is the point: retrofitting the running
gate onto a stack chosen late means redoing it.

<!-- e.g. React/Vite/Tailwind client · Express/Drizzle/Postgres server ·
     Vercel deploy · contracts/ dir. -->

## Module breakdown

The modules a session would scaffold, and for each the risky part. **Flag
every risky integration as a coupon** — a small throwaway spike that
proves the risky seam works (an external API, an auth flow, a schema
migration, a deploy target) before anything is built on top of it. A
flagged coupon prices the build honestly.

| Module | What it does | Coupon (risky seam to prove first) |
|---|---|---|
| | | |

## Assumptions & defaults

Everything defaulted above, restated in one list so a session (or the
filer, reading back) can challenge each one without re-deriving which
choices were guesses.

## Open questions

What must be answered before building starts, split into what **blocks**
scaffolding versus what can **proceed on the stated assumption**. An empty
section is a claim.

## Done-test

This brief is ready when a stranger session could start building from it
alone — no side-channel, no "ask the filer." If that is not yet true, the
gap is an Open question above, not a silent hole.
