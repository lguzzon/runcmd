---
references:
  - kind: code
    role: implementation
    target: scripts/operations/release-utils.js
---

# Hotfix branch

A branch of the hotfix family cut from main to fix a released version, carrying the version bump commit.

## Information kept

- **Name** — the branch name of the form hotfix/vX.Y.Z
- **Version** — the semantic version the hotfix prepares
- **Tag** — the vX.Y.Z git tag created at finish
- **Base branch** — the branch the hotfix starts from, main by default

## States

### Started

The branch exists and carries the version bump commit: version.txt written, the README version synced, and a changelog section prepended.

### Finished

The hotfix has been merged into main, tagged vX.Y.Z, main has been merged back into develop, and the branch has been deleted unless the Developer keeps it.
