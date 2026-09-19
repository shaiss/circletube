<!-- The field-test convention — the real-usage half of the loop. The gate
     proves the project ships in theory; the field log captures what happened
     when it actually ran, so the NEXT session (or the next deploy) starts
     from measured reality instead of an assumption. This is a convention plus
     a template, not a gate: nothing content-judges an entry.

     Convention:
       * Entries live under a "## Field test log" section in the project's
         NOTES.md, and that section stays LAST in the file. One entry per real
         usage event — a deploy result, an incident, a notable usage session.
       * Newest at the bottom (chronological).
       * Every entry is anchored to the deployed SHA it describes — a field
         note that can't be tied to a version is a rumor.
       * When a deviation is worth carrying forward (a config that must change,
         a constraint reality revealed), note it under Carry-forward. A human
         promotes it — into the charter, the config, or the backlog — nothing
         auto-applies it.

     Copy the block below. Delete these comments. -->

## Field test log

_Real usage of the deployed project, newest at the bottom. See
templates/FIELD-TEST.md for the convention._

### YYYY-MM-DD — <deploy / incident / usage>
- **Deployed SHA:** <commit this ran from>
- **Target:** <where it ran — prod URL, preview, local>
- **What happened:** <what worked, what broke, what a user hit>
- **Root cause / notes:** <if an incident — why; else observations>
- **Carry-forward:** <what a human should promote — a charter reopen, a
  config change, a backlog item — or "none">
