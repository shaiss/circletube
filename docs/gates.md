# The gate contract

The merge gate is forger's final word: what it means for a project to be
shippable, stated as a mechanism a machine can run and a human can trust
without re-reading the diff. This document is that contract's **design**,
ruled by PM.md D3. It is written before any gate exists so the first gate a
project earns is built to a settled shape rather than improvised — the same
way print-bench's `gate.sh` and `printcheck` had a doctrine before they had
code.

> **Status: unbuilt.** No gate, runner, or adapter exists in this repo
> (F1 docs-honesty; PM.md Deferred). Everything below is a contract and a
> set of disciplines, not machinery you can invoke. A gate becomes real
> only inside a project that is blocked without it and names that blocked
> session (F4) — for the first project, **circletube** (D4, per-project).
> The concrete runners and adapters are deferred; see the last section.

## Why two gates, not one

print-bench keeps two distinct verdicts on the built artifact and forger
inherits the split (D3):

- **The deploy gate** (print-bench's `gate.sh --slice`, PrusaSlicer as
  ground truth) — is the thing *consumable at all*? Does the real
  production toolchain accept it and run it?
- **The quality audit** (print-bench's `printcheck`, a scored report on the
  STL) — *how good* is the thing that runs? A composed, deterministic
  score, never a pass/fail on consumability.

They stay separate on purpose. Merging them lets a boot failure hide inside
a quality score — a gate that reports "87/100" while the app never came up
is a toolchain silence of exactly the kind CLAUDE.md tells every session to
hunt. Consumability is binary and comes first; quality is graded and comes
after. A project merges only when the deploy gate is green **and** the
quality audit clears its committed floor.

Both are measured on the **built, running** artifact, never on a
restatement of the brief (CLAUDE.md: converge on gates, never on taste; a
check that restates its own premise is not a check).

## Gate A — the deploy gate (the slicer analog)

The merge gate's final word. A portable, exit-coded contract with four
steps, run in one CI pass:

1. **Build the release artifact** from committed source through the
   project's real production build — the same command a deploy would run,
   no dev shortcuts.
2. **Deploy to the project's declared target.** The target is a required
   field in the project's brief (D4 — each project commits its own stack).
3. **Boot** the deployed instance and wait for it to report healthy on its
   own terms (a health endpoint, a ready log line, a responding port) —
   never a fixed sleep.
4. **Run the committed smoke e2e** against the running instance: a small,
   frozen set of end-to-end assertions that exercise a core user flow
   through the deployed surface, not a unit harness against mocks.

Exit non-zero at any step fails the gate. The verdict is the exit code; a
model may explain a failure but the code decides (CLAUDE.md: AI is
advisory; the gate decides).

### Deploy adapters and the fidelity floor (D5)

Step 2's *how* is an adapter, and adapters are earned per project:

- **The container baseline (free, always available).** Build an image, run
  it as an ephemeral container, boot, smoke. This is the zero-cost adapter
  every project gets without provisioning anything, and it is where a
  single-operator project may stop (D5 sets the fidelity floor:
  single-operator → container-boot-smoke is sufficient).
- **Real-PaaS adapters (earned).** Vercel, Railway, owner infra — a real
  hosted deploy against the actual production target. A **stranger-facing**
  project forces this: the floor rises with the audience (D5). Each
  real-PaaS adapter is machinery a project earns when it is blocked without
  it (F4), not something forger ships up front.

**The container-baseline false-confidence risk, stated plainly:** a green
container-boot-smoke proves the artifact boots and serves *in a local
container*. It does **not** prove the real host will accept it — platform
build quirks, missing runtime env vars, function/memory/timeout limits,
edge vs. node runtime differences, cold-start behavior, and managed-service
wiring (a real database, real secrets) are all invisible to the container
and routinely break a first hosted deploy that passed locally. The
container baseline buys speed and a real floor; it does not buy production
truth. A project that ships to anyone must climb to a real-host adapter
before it trusts the deploy gate as its merge word.

## Gate B — the quality audit (the printcheck analog)

A **separate**, composed, deterministic audit of the built output, scored
0–100 and exit-coded against a committed floor. Nothing off-the-shelf owns
the whole score; it is composed from named sub-audits, each measured on the
artifact:

- **Typecheck** — the build's own type toolchain, zero errors.
- **Lint** — the project's committed rule set, treating disabled/ignored
  rules as findings (a lint rule disabled and forgotten is a toolchain
  silence — CLAUDE.md).
- **Dependency audit** — known-vuln scan and license reach (license policy
  is F6; viral-licensed code stays out of shared forge core).
- **Bundle size** — measured against a committed budget, not a vibe.
- **a11y / perf** — deterministic checks (e.g. axe rules, a Lighthouse-class
  budget) on the built, running surface.

The score is deterministic — the same commit yields the same number. AI may
**phrase** the findings (deterministic before LLM; a model only phrases,
strippably), but the number and the pass/fail against the floor are
mechanical. The audit is kept out of the deploy gate for the reason above:
a boot failure must never be averageable into a quality score.

## Disciplines every gate ships with

Adopted wholesale from print-bench (factory-map: `guard-check`,
`check.sh` selftests, the `regen` job). A gate that lacks these is not a
weaker gate — it is a gate you cannot trust, because it may be one that
*cannot fail* rather than one that *has not failed* (CLAUDE.md: a gate that
has never fired looks exactly like a gate that cannot).

- **A negative control.** Every gate ships with an input it must reject and
  a proof it does. The deploy gate carries a deliberately-broken build or a
  smoke assertion pointed at a flow that is wired to fail; the quality
  audit carries a fixture that must score below the floor. If the negative
  control ever passes, the gate is broken, and that is finding #1.
- **A `--selftest`.** The gate can be run in a mode that plants a known
  violation and confirms it catches it, so a session resuming work can
  prove the gate still bites before trusting a green run (CLAUDE.md:
  recorded state is a claim, not a fact — re-run before trusting).
- **Freshness by construction.** Every derived artifact the gate reads or
  reports — screenshots, bundle reports, generated clients, the smoke
  transcript — is **regenerated by CI in the same run that gates it**, never
  read from a hand-committed copy (F1). A committed artifact can never be
  older than the source beside it because a human never commits it.

## Worked example — circletube's first gate

circletube (project #1) has **no active gate today**. Its `package.json`
exposes only `check: tsc`; there is no lint config, and its server test
suite is archived under `.archive-server-tests/` (Jest + supertest, not
run). So its quality bar today is "the types check" — nothing proves the
app boots, and nothing proves a user flow works. That makes a first gate
**the highest-value first machinery forger can bring** to it: it converts a
project whose only signal is `tsc` into one with a real consumability
verdict.

Sketched to this contract (**not built here** — building it is the
circletube-embed phase, D4 per-project):

**Deploy gate (Gate A).** circletube's declared target is **Vercel**
(`vercel.json`: `npm run build` → `vite build` + an esbuild server bundle,
output `dist/public`, `server/index.ts` as a function, env `DATABASE_URL` /
`OPENAI_API_KEY` / `SESSION_SECRET`). It is a social app meant for people,
so it is stranger-facing and the fidelity floor forces a **real Vercel
deploy**, not just the container baseline — the Vercel-specific pieces
(function memory/`maxDuration`, the `/api` and `/ws` rewrites, the three
managed secrets, a reachable Postgres) are precisely what a local container
would not exercise. Boot waits for the deployed instance to serve, then a
**committed smoke e2e** drives one core flow end-to-end against it (a
plausible first flow: sign in → load the feed → create a post → see it
appear — the app's reason to exist).

**Quality audit (Gate B).** `tsc` (already present) as the typecheck
sub-audit; **eslint added** (there is none today — adding it is itself part
of the gate's value) as the lint sub-audit; a dependency/license audit over
its large Radix/TanStack/Drizzle graph; a bundle budget on the `vite`
output; a11y checks on the built client. Scored, floored, exit-coded, split
from the deploy gate.

**With their disciplines:** the deploy gate's negative control is a smoke
assertion aimed at a flow wired to fail (it must go red); the audit's is a
fixture below the floor; each carries a `--selftest`; the smoke transcript,
screenshots, and bundle report are regenerated by CI in the gating run, not
committed by hand.

Naming this is a **design sketch**, not a build. Which flow the smoke test
covers, the exact budgets and floors, and the Vercel adapter itself are the
project's to earn when a circletube session is blocked without them (F4),
and any generic part of what gets built there returns to canonical forger
only through the middle-hop scrub (F5; upstream.md).

## Deferred (F4)

Specified now: the **contract** (two gates, four deploy steps, the composed
audit) and the **disciplines** (negative control, `--selftest`, freshness
by construction). Deferred until a project is blocked without them:

- Every concrete **runner** — the actual scripts that execute Gate A and
  Gate B and their exit-code aggregation.
- Every **deploy adapter** beyond the contract — the container baseline
  implementation, and each real-PaaS adapter (Vercel for circletube;
  Railway; owner infra), each earned per project.
- The **smoke e2e harness** and the concrete negative controls and
  selftests for a given project's flows.
- The **CI wiring** that regenerates derived artifacts in the gating run
  (the `regen`-job analog), and the path→gate classifier that decides which
  gates a given change must clear.

Each of these is machinery, and machinery earns its place by naming the
project session it unblocked (F4), then re-deriving back into canonical
forger through the scrub if it is generic (F5).