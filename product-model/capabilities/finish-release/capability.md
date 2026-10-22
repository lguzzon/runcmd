---
domain: high-level-operations
availability:
  - { place: git-flow-cli }
references:
  - kind: code
    role: implementation
    target: scripts/operations/release-utils.js#handleFinish
  - kind: code
    role: implementation
    target: scripts/release-finalize.js
---

# Finish a release

Finish a release branch with a required tag and message: merge it into its integration branches, tag vX.Y.Z, push branches and tags unless offline, and delete the branch unless kept. `release-finalize.js` finishes the branch with automatic detection of release and hotfix branches and an optional JSON summary.
