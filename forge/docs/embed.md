# Embedding forger into a project

> **PUBLIC-SAFE EMBED (while `shaiss/forger` is private):** subtree
> `add` / `pull` MUST use branch `embed/public-safe-package` only.
> Do **NOT** subtree forger `main` (or tip `94f24af`) into a public
> project — that would publish the private tip. Cipher CLEAR is tip-pinned;
> if the package tip moves, re-CLEAR. After forger itself is public, this
> rule may be renegotiated in PM.md.

This is the procedure that makes forger "a machine you pull into a
project's repo" (D1). It is the downstream half of the embed hop in
[docs/upstream.md](upstream.md), spelled out as concrete steps. It is a
**manual procedure**, proven by hand on the first project before any of it
is automated — there is no `/embed` skill and no `forger-init` script, and
this document does not pretend one exists (F1, F4). What is specified here
is the *procedure* and the *record format*; the automation is deferred
(below).

The worked example throughout is **circletube** (project #1) — a public
TypeScript agentic-app repo (React/Vite client, Express/Drizzle/Postgres
server, Vercel deploy, a `contracts/` dir) that already carries its own
agent conventions. It is the messy real app the procedure has to fit, so
every step shows both the generic rule and what it means there.

## What "embed" means

A project is its own self-contained repo. forger is pulled **into** that
repo as a legibly-separate tenant: the machine's files live under one
prefix, the project's source lives everywhere else, and the two never
merge into one undifferentiated tree. That separability is the whole point
of D1 — factory work must stay distinguishable from project work even when
they share a git history (F4, sharpened; design-intent.md).

The reproducible truth now spans two gits (F3): forger's own repo, and the
project's — and the project records **which forger SHA it embeds** so a
clone carries an exact, reconstructable machine.

## 1. Pull the machine in — git subtree

forger is embedded as a **git subtree** under a single visible prefix. The
leading candidate (D9) is decided here for the manual procedure; the
prefix is the project's to name, but forger recommends a **visible,
non-dot** directory:

```
git subtree add --prefix forge \
  https://github.com/shaiss/forger embed/public-safe-package --squash
```

This puts the whole machine under `forge/` and records the source URL and
squashed upstream SHA in the merge commit — the lineage is in git history,
not a promise.

**Why `forge/` and not `.forger/`.** The embedded machine must be visible
to the very sessions meant to operate it. circletube's own `AGENTS.md`
tells agents to avoid dot-prefixed directories and anything in
`.agentignore`; a dot-named embed would be invisible to exactly those
sessions. Use a plain directory name, and do **not** add it to
`.gitignore` or `.agentignore`.

**Why subtree over submodule or package.**

- **Editable in place.** A project tunes forger where it sits (D1, D4). A
  submodule is a pinned pointer that fights in-tree edits; an npm/package
  dependency is read-only in `node_modules`. A subtree is just files in
  the tree — edit them, commit them, they are yours.
- **Records prefix + SHA.** The subtree merge commit carries the upstream
  URL and SHA, so the embedded version is always recoverable (F3).
- **Self-contained.** A clone of the project carries the machine with it;
  nothing extra to fetch, no external state (F3).

**The relationship is loose by default.** Embedding is take-once: a project
pulls forger in, and its team may **never think about forger again** — they
diverge freely and build their app. There is no live dependency, no
continuous sync, no obligation to track upstream. Re-pulling a newer
machine (below) is *optional and rare*, and backflow (§3) is an
*occasional, deliberate gift*, not a protocol. Model the default as **no
ongoing relationship**.

### Re-pulling a newer forger later (optional)

Most projects never do this. A project that *wants* newer machinery pulls
it **deliberately** — there is no automatic recall, and version skew is an
accepted cost of self-contained projects (upstream.md):

```
git subtree pull --prefix forge \
  https://github.com/shaiss/forger embed/public-safe-package --squash
```

Because the project may have tuned `forge/` in place, a re-pull can
conflict on tuned files — resolve them like any merge, re-checking each
`tuned:` line in the project's lineage record (§3) against the new machine.
A project that expects to re-pull often is better off keeping its tunings
in a thin override layer beside `forge/` rather than editing the machine's
files directly, so re-pulls stay clean. Either way this is the project's
call, on the project's schedule — forger neither knows nor cares.

## 2. What init lays down

Embedding the machine is step 1; **init** is laying down the per-project
work surface. It copies the templates **out of** the subtree into the
project as the project's own, project-authored documents — out of, so a
later `subtree pull` overwriting `forge/` never clobbers the project's
charter or log:

- `forge/templates/brief.md` → the project's **brief** (what it IS
  and for WHOM; "customer" is a required field, D5; the stack is committed
  here, D4; risky integrations flagged).
- `forge/templates/PM.md` → the project's **charter** (numbered
  non-negotiables with sources and reopen conditions).
- `forge/templates/NOTES.md` → the project's **engineering log** (what
  HAPPENED, addressed to the next session — a decision not in the log
  didn't happen).
- `forge/templates/README.md` → the project's **product page** (what a
  stranger reads).
- `forge/templates/FIELD-TEST.md` → the project's **field log** (the human
  lead's record of running the built thing on real hardware/targets).

These are the three-documents-three-audiences doctrine plus the brief and
field log, made concrete per project. They live at the project's own
locations (project root or its `docs/`), authored and owned by the
project, never overwritten by a machine re-pull.

**Init writes no gates, no CI, no scripts.** Those are F4-earned by a real
blocked session in the project, not laid down at embed time. Init records
the *current* reality honestly — for circletube that means the brief and
log state plainly that the server test suite is archived
(`.archive-server-tests/`) and `package.json` exposes only `check: tsc`,
so there is **no gate yet**. That honest baseline is finding #1 for the
first project session, not something the embed papers over.

### The child-tier lineage record (project side)

Init creates the project's own lineage record — the child-tier analog of
forger's `upstream.conf`, the "inverted-inverted" record: forger's
`upstream.conf` points **up** to print-bench; this one points **up** to
forger. It lives on the **project side**, at the project root **outside**
the `forge/` prefix (so a re-pull never overwrites it), named e.g.
`forge.conf`, in print-bench's `key: value` conf format:

```
# forge.conf — this project's forger lineage record.
# Points up to canonical forger; format mirrors forger's upstream.conf.
forger:        https://github.com/shaiss/forger
embed-prefix:  forge/
embedded-sha:  <the SHA subtree add/pull recorded>
embedded-date: 2026-08-23

# tuned: project-local divergences from the embedded machine, one per line,
# as `tuned: <path under embed-prefix> | <why>`. Each is a claim the next
# subtree pull re-checks (§1).
# tuned: forge/scripts/gate.sh | project uses Vercel preview, not the ephemeral-container baseline

# backflow: generic improvements returned to canonical forger, one per line,
# as `backflow: <date> <forger PR/SHA> | <what was generalized>` (§3).
```

### Reconciling with existing agent conventions

A real project already has conventions; the embed **absorbs or points to
them, it does not fight them** (route-don't-duplicate). circletube ships
`AGENTS.md`, `agent_guidelines.md`, and `docs/agent_rules/*` (the API,
database, flows, and testing rules), with `AGENTS.md` naming
`docs/agent_rules/` as the primary reference. So at init:

- The project's **brief** cites those files as project-authored inputs —
  the stack, the API conventions, the data model are *given*, not
  re-invented by the machine.
- The project's existing entry point (`AGENTS.md`) is amended to point at
  the embedded machine under `forge/` — one added line routing sessions to
  the forge, not a second competing rulebook.
- forger authors **no** duplicate of what `docs/agent_rules/` already
  says. A duplicated fact is a future lie; the machine references the
  project's home for each fact and adds only what the project lacks.

### Where CI runs

All of the machine's machinery — gates, tooling, autonomy — **runs in the
project's own repo and CI**, over the embedded `forge/` tree. circletube's
CI invokes forger's gates against circletube; canonical forger is never in
that loop and **knows nothing of it**. forger's own repo runs CI only for
**forger itself** — the machine's selftests and negative controls, proving
its gates can still fail (the discipline in `docs/gates.md`). Two CIs, each
scoped to its own repo: the project exercises the machine where the machine
lives (in the project), and forger exercises only itself. This is the F1
"CI owns what's derived" rule applied per repo, not a shared pipeline.

## 3. Backflow — the occasional gift back to forger

Backflow is **rare and optional**, not a sync protocol. Most projects
embed forger and never send anything back. When someone *does* make a
**generic** improvement to their embedded forger — a better gate, a sharper
selector, a fix to a machine script — they may choose to return it so the
machine compounds and the next embedder starts from a better one. That
choice is the exception, taken deliberately, not an obligation the
relationship imposes.

The mechanism is a **hand-curated pull request to forger**, not an
automated transport. `git subtree push` is deliberately *not* the channel:
it would shove the whole `forge/` diff — including the project's own
tunings — upstream, which is exactly what the scrub forbids. Instead, the
contributor lifts the one generic change out of their tunings, scrubs it,
and opens it as a normal PR against forger. (This is why backflow, though
it keeps the machine compounding — D4's extract-on-second has no shared
catalog to extract into, so canonical forger *is* the shared home — is best
treated as a nice-to-have that a maintainer does when it's worth it, not a
step every project owes.)

Its one discipline is the **scrub**: before the change crosses back, strip
the project's names, paths, secrets, and proprietary material from it. The
boundary test in [docs/upstream.md](upstream.md) governs the crossing —
all three parts (motivation, content, vocabulary) must hold, checked at the
**middle hop** (project → forger) against a denylist of the project's names
and paths:

1. **Motivation** — the change is justified from forger's own terms, no
   cover story that leans on project-only context.
2. **Content** — zero strings, names, paths, examples, or fixtures that
   originate in the project.
3. **Vocabulary** — expressed in generic machine terms, never one
   project's domain language.

The scrubbed improvement lands in forger as a normal reviewed PR; the
crossing is logged in PM.md's decision log (date, direction, SHAs, what was
generalized) and appended to the project's `forge.conf` under `backflow:`.

**circletube is public, so its backflow is hygiene, not
confidentiality** — there is no secret to leak. But the scrub rule is
**general**: it is written for the first *private* project, where an
imperfect scrub would carry one project's proprietary material into the
public machine and thence into the next (possibly competing) project. Doing
the scrub cleanly on a public project is the rehearsal that makes it
trustworthy when it becomes confidentiality-critical.

**A learning bound for print-bench crosses two hops.** A generic
improvement that belongs upstream in print-bench travels `project → forger
→ print-bench` and passes the boundary test at **both** seams — the
middle-hop scrub first, then the print-bench re-derivation (upstream.md).

## What is deferred (F4)

Only the procedure and the record format above are specified now. Not
built:

- **The automated `forger-init`.** The manual procedure is proven by hand
  on circletube first; the script (and any `/embed` skill) is earned only
  once the manual steps are stable and a session is actually slowed without
  automation. Automating an unproven procedure would bake in its mistakes.
- **The scrub as a pre-push script.** The scrub and boundary test start as
  the checklist above and in upstream.md; they graduate to a self-testing
  pre-push script — one that plants a violation to prove it can fail — when
  a real backflow first needs it (upstream.md; PM.md Deferred).
- **The domain tier (D10).** circletube embeds forger **directly** —
  there is no domain layer yet. When a second agentic-app project shares a
  specialization, a domain is extracted and the same embed/backflow/scrub
  discipline runs at **two** seams (forger ↔ domain, domain ↔ project). The
  domain seam is retrofitted then, not designed now.
