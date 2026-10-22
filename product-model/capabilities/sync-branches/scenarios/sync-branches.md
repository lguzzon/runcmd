---
kind: primary
routes:
  cli: Git Flow helper
steps:
  - text: The Developer runs sync
    kind: actor
    actor: developer
    entities: []
    contexts:
      cli: { place: git-flow-cli }
  - text: The Product stashes any uncommitted changes
    kind: product
    actor: developer
    entities: []
  - text: The Product pulls and pushes main, or master
    kind: product
    actor: developer
    entities: []
  - text: The Product pulls develop, merges main (or master) into it, and pushes it
    kind: product
    actor: developer
    entities: []
  - text: The Product restores the original checkout and the stashed changes
    kind: product
    actor: developer
    entities: []
  - text: Main (or master) and develop are synchronized
    kind: condition
    entities: []
---

# Sync the base branches

## Trigger

The Developer synchronizes the repository's long-lived branches.

## Outcome

Main (or master) and develop are current with the remote and with each other, and the Developer is back where they started.

## Edge cases

- --dry-run prints the actions without executing them; --offline skips remote operations.
- A merge conflict aborts the sync after the original checkout and the stashed changes are restored, and the conflict is reported for manual resolution.
