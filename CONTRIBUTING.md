# Contributing to Circletube

## Workflow

1. Branch from `main`. Keep each pull request small and about one thing.
2. Before pushing, run locally:
   - `npm run check` (type errors must not increase)
   - `npm run build`
   - `npx jest -c jest.unit.config.cjs --ci -i`
3. Open a pull request against `main` with a plain description of what changed and how it was tested.
4. A pull request is ready to merge when all of these hold:
   - CI is green (`CI OK`).
   - Every review comment, including automated reviewers, is resolved or answered.
   - The required reviewers have signed off on the exact head commit. A new push needs a fresh sign-off.
5. Maintainers squash-merge. Merge commits and rebase merges are not used, and `main` is never force-pushed.

## Commits

- Write a short, neutral subject in the imperative mood ("Add …", "Fix …").
- Do not rewrite or force-push shared history. Fix forward with a new commit.
- Commits made by AI agents use the agent identity `Cursor Agent <cursoragent@cursor.com>` as author and committer, end with an `Agent: <name>` trailer, and carry no `Co-authored-by` lines.

## What not to commit

- Secrets, tokens, `.env` files or real connection strings. Use `.env.example` for variable names.
- Personal data such as email addresses or phone numbers.
- Generated output (`dist/`, coverage, logs) or patch/diff files.

## Tests

Add or update a unit test under `server/test/unit/` for server changes, and register it in `jest.unit.config.cjs` (`testMatch`). Keep tests offline: no network calls and no real API keys.
