# The lineage contract

forger's lineage has **two phases** (PM.md D1, D10).

**Now — bootstrap (temporary):** print-bench is forger's MVP, and forger is
being extracted from it. forger is private only until it has adopted what
it needs; then it goes public.

```
print-bench (public MVP)  →  forger (private for now, then public)
```

**Enduring — the target architecture:** forger is the generic base; a
**domain** specializes it for a field; a project builds within a domain.
print-bench itself gets refactored onto forger as its first domain.

```
forger (public machine)  →  domain (3d-printing/openscad; agentic apps; …)  →  project (e.g. circletube)
```

Each hop has a downstream (pull, free) and an upstream (contribute back,
disciplined) direction, and the hops are **not the same pattern mirrored**
— they run opposite disciplines (below). F5 was renegotiated (PM.md
decision log, 2026-08-22): forger's privacy is temporary and instrumental,
not a durable secret, so the contract no longer exists to hide forger. It
exists to keep the **confidentiality of any private tier** (a private
domain's or a private project's context never crosses into the public
machine, into another domain/project, or into a public artifact) and
**cross-tier hygiene** (every contribution is re-derived and
target-native). Privacy is a **per-tier property** (PM.md D10): the base
(forger) is public, and a domain or a project may be public or private,
and the durable specialization worth protecting concentrates at the
**domain** tier, above the deliberately generic base. This document is the
whole contract; every session that touches any hop is bound by it.

The `print-bench ↔ forger` bootstrap hop is fully specified below and is
what a session works today. The embed hops (`forger ↔ domain`,
`domain/project ↔ forger`) are **new and their mechanism is open** (PM.md
D9/D10): factory-map classifies the `derives.conf` third tier `rethink`,
and the advisory brief struck the claim that it is pre-settled. What is
fixed now is the *discipline*, not the tooling. Until a domain exists, a
project (circletube) pulls forger directly — the domain seam is retrofitted
when a second project in a field shares a specialization.

## The boundary is already drawn (print-bench ↔ forger)

print-bench's own architecture splits it into a domain layer and a
platform layer that "talks about files, gates, derived artifacts, and
workflows — never about millimeters." That layer-1 boundary is the seam:
forger consumes print-bench's platform layer and swaps the domain behind
the seams. The sync needs no new boundary invented — it needs the existing
one enforced, in both directions.

## Downstream: print-bench → forger

- forger tracks print-bench as a **read-only** upstream. Never push,
  never write issues/PRs/comments there from forger work.
- [`upstream.conf`](../upstream.conf) is forger's lineage record — an
  inverted `derives.conf`: the upstream URL, the last-synced SHA, every
  platform file forger has adopted, and every deliberate divergence forger
  carries. forger declares its parent; the parent carries no back-pointer,
  by construction (print-bench is not modified to know about forger — a
  matter of not polluting the upstream repo, no longer of secrecy).
- A sync pass diffs upstream's platform files against forger's copies
  since the recorded SHA and files a **sync brief** issue here listing
  what changed upstream; adoption happens via normal reviewed forger PRs,
  adapted at the seams, with `upstream.conf` updated in the same PR.
  Manual and ad-hoc at first; a scheduled routine only once a session is
  actually blocked without one (F4).
- Divergences recorded in `upstream.conf` are claims the next sync
  re-checks — checked rather than trusted, exactly as print-bench treats
  `replaces:` claims.
- On conflict over a shared platform mechanism, **print-bench wins by
  default**: it is the public reference implementation, hardened by more
  eyes and more runs. forger overrides deliberately or not at all, and
  every override is a recorded, re-checked claim.

## Upstream: forger → print-bench

Never cherry-pick forger commits. A learning goes up by being
**re-derived and re-authored** inside print-bench as a print-bench-native
PR: motivated by a need print-bench can demonstrate from its *own*
committed history and issues, written in its layer-1 vocabulary, tested
against its own fixtures, with fresh commit messages and no forger
authorship trail.

print-bench's own N6 already demands this — platform machinery "must
trace to a need a real session hit," and for print-bench that means a
*print-bench* session. If print-bench has not hit the need, the learning
waits here. Do not manufacture a pretext, and do not smuggle it in as
"general hardening." When the failure class genuinely exists in both
places, the honest path is to reproduce it in print-bench first — a real
issue, a real failing case — then fix it there, which is how every
print-bench rule earned its citation in the first place.

## The embed hops: forger → (domain) → project (open mechanism, fixed discipline)

The embed hops are the **inverse** of the print-bench hop, and they are
**loose**. There, forger is a read-only consumer that re-derives upward.
Here, whoever embeds forger pulls the machine in and tunes it in place —
and, by default, that is the whole relationship. A project embeds forger
once and its team **may never touch forger again**: no live dependency, no
continuous sync, no obligation to track upstream. The same loose discipline
applies at **both enduring seams** — `forger ↔ domain` and `domain ↔
project` (D10) — but until a domain is extracted, a project (circletube)
embeds forger directly, so the live hop today is `forger ↔ project`. Either
seam may cross a privacy boundary — a private domain built on the public
base, a private project built on a domain — and when it does, the scrub
below protects whichever side is private (a private domain's material at
`forger ↔ domain`, a private project's at `domain ↔ project`). The
mechanism is open (PM.md D9/D10):

- **Downstream (forger → project): pull once, tune, mostly forget.** A
  project embeds forger (git subtree the leading candidate — editable in
  place, records the prefix + SHA, self-contained), records which forger
  SHA it embeds, and tunes freely. Pulling a newer forger later is
  **optional and rare** — most projects never do; there is no recall, and
  version skew is an accepted cost of self-contained projects. Machinery
  runs in the **project's own CI**, never forger's.
- **Upstream (project → forger): backflow is an occasional gift.** Rare,
  optional, and hand-curated — not a transport. When someone *chooses* to
  return a generic improvement, they lift it out of their tunings, **scrub**
  it (strip the source tier's names, paths, secrets, proprietary material —
  a project's, or a private domain's at the `forger ↔ domain` seam), and
  open it as a normal PR against forger — never `git subtree push`, which
  would carry the source's own tunings with it. It keeps the machine
  compounding (D4's extract-on-second has no shared catalog, so canonical
  forger *is* the shared home), but it is a nice-to-have a maintainer does
  when it's worth it, not a step every project owes.
- **Two hops for a print-bench-bound learning.** On the rare occasion a
  learning that started in a project belongs in print-bench, it travels
  `project → forger → print-bench` and passes the boundary test at **both**
  hops — the scrub first, then the print-bench re-derivation below.

Each project keeps its own lineage record (which forger SHA it embeds,
what it tuned) on the **project** side — the child-tier analog of
`upstream.conf`. None of this tooling is built; it is F4-earned at
project #1.

## The boundary test

The same three tests govern **both** upstream crossings — the middle hop
`domain/project → forger` (scrub the source tier's private material — a
project's, or a private domain's) and `forger → print-bench` (re-derive to
print-bench-native). Before anything crosses, all three must hold. Fail any
one and it does not go up.

1. **Motivation.** The change can be fully motivated from print-bench's
   own committed history and open issues, with no reference to anything
   that exists only in forger. If writing the PR description would
   require a cover story, it stays private.
2. **Content.** The diff contains zero strings, names, paths, examples,
   commit trailers, issue references, or test fixtures that originate in a
   private tier (a project's name, client, secrets; a private domain's
   proprietary material) or, for the print-bench hop, in forger —
   mechanically checkable by scanning the outgoing branch against a
   denylist (a private tier's names and paths at the middle hop — a
   project's, or a private domain's; `forger` and project names at the
   print-bench hop).
3. **Vocabulary.** The change is expressed in the target's own terms —
   at the print-bench hop, layer-1 terms (files, gates, derived artifacts,
   workflows) or print-bench's own domain terms, never app-product terms
   that only make sense as forger exhaust; at the middle hop, generic
   machine terms, never one project's domain language.

This starts as this checklist. It graduates to a pre-push script — with a
selftest that plants a violation, because a boundary check that has never
fired looks exactly like one that cannot — when a real crossing (either
hop) first needs it (F4; tracked in PM.md's Deferred list).

## Provenance

PM.md's append-only decision log records every crossing on every hop:
date, direction, SHAs, what was generalized or adopted. The full history
stays reconstructible from forger's own side. The shape: print-bench is a
complete, self-justifying public project whose platform layer forger
adopts and re-derives to; forger is the machine that remembers its whole
lineage; and each project is a self-contained repo that embeds the machine
and keeps its own child-tier record. Confidentiality now flows the other
way from the founding design — not forger hiding from print-bench, but
each private tier's context (a private domain's or a project's) never
crossing into the public machine or a public artifact.
