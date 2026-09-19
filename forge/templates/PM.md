# <Project name> — product charter

<!-- The per-project charter forger lays down on embed. This is what the
     project IS and who it is FOR; NOTES.md is the engineering log of what
     happened, and README.md is the product page a stranger reads. Keep it
     short enough to hold in mind — past a page it has stopped being a
     charter. Stack-agnostic; circletube is shown as an example, not a
     default. Delete these comments. -->

## The product, in one paragraph

What it is, the one thing it must do well, and — required — the
**customer**: who operates or uses it. Single-operator is the default
(D5); a project that ships to strangers earns its own auth, telemetry,
and store, declared in its own scope, not assumed here. If you cannot
name the customer, the project does not have a charter yet.

**Customer:** <who this is for — a named operator, a role, or a user segment>

## Non-negotiables

Constraints that may **not** be weakened to make building easier. Each
needs a source and a reopens-if condition. Where a constraint can be
mechanically checked, it should compile into the project's tests / lint /
CI policy so the gate catches a violation, not a reviewer — a project
grows that policy as it earns it (forger ships none of it by default).

| # | Constraint | Source | Reopens if | Enforced by |
|---|---|---|---|---|
| N1 | | | | |

## Out of scope

**Deferred** — good ideas, not now, ranked in the backlog below.

**Never** — things this project will not do, with the reason. This list is
the charter's most useful asset; without it every session re-litigates the
same suggestions.

## v1 — definition of done

What must be true to call the first version finished. Checkable by someone
other than the author, and **separate from "gates are green"** — gates
green is necessary, not sufficient. This is the taste bar the human lead
owns.

- [ ]

## Backlog, ranked by user value

Ranked by what the customer hits most often, not by what is interesting to
build (F4). Include a cost where the repo can tell you (a risky migration,
a new dependency, a deploy surface).

| # | Item | Why this rank | Cost |
|---|---|---|---|
| B1 | | | |

## Open decisions

Questions only the human lead can answer. Mark which ones **block** work
versus which can proceed on a stated assumption.

| Question | Blocking? | Assumption if unanswered |
|---|---|---|

## Decision log

Append-only. Date, decision, reason. A later session must be able to tell
a considered choice from an accident — a decision that isn't logged didn't
happen.

| Date | Decision | Reason |
|---|---|---|
