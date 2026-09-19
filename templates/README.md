# <Project name>

<!-- The product page forger lays down on embed — what a STRANGER reads to
     decide whether to use the project and how to run it. PM.md is what it IS
     and for whom; NOTES.md is the engineering log. This page gets a
     structural gate later (H1 title, a pitch, a working quickstart, at least
     one screenshot that exists, an honest status) — the gate is earned per
     project, not shipped by forger. Every claim here is about the RUNNING
     thing; anything a model drafted for a human carries a marker the human
     deletes. Stack-agnostic; circletube shown as example. Delete these
     comments. -->

One- or two-sentence pitch: what it is, the problem it solves, who it is
for.

<!-- Lead with a real screenshot of the running app — captured by CI from the
     deployed instance once the project has that machinery, never a mockup. -->
![Screenshot](docs/screenshot.png)

## Status

Honest, current state. What works, what is stubbed, what is known broken.
A warning here is worth more than a silent gap — say "no auth yet",
"single-operator only", "data resets on redeploy" plainly if true.

## Quickstart

The shortest path from clone to running locally. Real, copy-pasteable
commands that work today.

<!-- e.g.
     npm install
     cp .env.example .env   # set DATABASE_URL
     npm run db:push
     npm run dev            # http://localhost:5173
-->

## Deploy

How the running instance is stood up (the project's declared deploy
target) and the URL, if there is one.

## Configuration

The environment variables / settings a user must supply, with what each
does. Point at an `.env.example` for the full list rather than duplicating
it here.
