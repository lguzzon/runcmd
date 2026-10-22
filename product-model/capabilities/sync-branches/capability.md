---
domain: high-level-operations
availability:
  - { place: git-flow-cli }
references:
  - kind: code
    role: implementation
    target: scripts/operations/sync.js#handleSync
---

# Sync branches

Synchronize main (or master) and develop with the remote: stash uncommitted changes, pull and push the base branch, pull develop, merge the base into develop, push develop, and restore the original branch and the stash.
