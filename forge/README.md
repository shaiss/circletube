# forger — public-safe embed package

**Not the full private forger tip.** Cipher-reviewable surface for embedding
into a **public** project under `forge/` without publish-via-embed of the
private bootstrap tip.

## Homes

| Location | Use |
|----------|-----|
| `public-embed/` on `main` (this tree, once merged) | SoT listing inside private forger |
| Branch `embed/public-safe-package` (orphan tip) | What circletube **subtree**s after Cipher CLEAR |

## Gate

1. Cipher CLEAR on package tip (`embed/public-safe-package` @ current SHA)  
2. Circletube:  
   `git subtree add --prefix forge https://github.com/shaiss/forger embed/public-safe-package --squash`  
3. Init templates out of `forge/templates/` → project-owned paths  
4. Root `forge.conf` outside `forge/` (see `docs/forge.conf.example`)  
5. One-line `AGENTS.md` → `forge/`  
6. No CI / runners / `forger-init` at embed (F4)

History-scrub → forger full public flip remains a **separate** track (`docs/public-flip-scrub.md` / PR #9).

See [MANIFEST.md](./MANIFEST.md).
