---
appliesTo:
  - type: capability
    id: start-release
  - type: capability
    id: start-hotfix
---

# Version files are written at the repository root

The version, changelog, and README writes of a bump land in the repository root, wherever in the repository the Git Flow helper is invoked.

## Rationale

A bump edits the repository's single version source, so a write that landed in the invocation directory would fork the version state.
