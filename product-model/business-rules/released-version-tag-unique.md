---
appliesTo:
  - type: entity
    id: release-branch
    effect: creates
    facts: [Version]
  - type: entity
    id: hotfix-branch
    effect: creates
    facts: [Version]
---

# A released version is never re-cut

A release or hotfix is started only when no vX.Y.Z tag exists for its version.

## Rationale

A released version re-cut into a branch could never be finished, because the tag it would place already exists.
