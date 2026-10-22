---
appliesTo:
  - type: capability
    id: start-branch
  - type: capability
    id: finish-branch
  - type: capability
    id: start-release
  - type: capability
    id: finish-release
  - type: capability
    id: start-hotfix
  - type: capability
    id: finish-hotfix
---

# Branch operations require a clean tree

Starting or finishing a branch, release, or hotfix is refused when the working tree has uncommitted changes.

## Rationale

The operations merge and delete branches; a dirty tree could lose the Developer's uncommitted work in the merge.
