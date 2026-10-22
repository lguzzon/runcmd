---
domain: high-level-operations
availability:
  - { place: git-flow-cli }
references:
  - kind: code
    role: implementation
    target: scripts/operations/release-utils.js#handleFinish
---

# Finish a hotfix

Finish a hotfix branch with a required tag and message: merge it into main, tag vX.Y.Z, merge main back into develop, push unless offline, and delete the branch unless kept.
