---
appliesTo:
  - type: capability
    id: start-release
  - type: capability
    id: start-hotfix
---

# The version never lowers

A bump never resolves to a version lower than the current one; an invalid or lower version is refused.

## Rationale

Releases and hotfixes cut a branch per version, so a version that went backwards could collide with an already-released one.
