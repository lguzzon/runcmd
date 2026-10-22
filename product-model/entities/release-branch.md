---
references:
  - kind: code
    role: implementation
    target: scripts/operations/release-utils.js
---

# Release branch

A branch of the release family cut from develop to prepare a version, carrying the version bump commit.

## Information kept

- **Name** — the branch name of the form release/vX.Y.Z
- **Version** — the semantic version the release prepares
- **Tag** — the vX.Y.Z git tag created at finish
- **Base branch** — the branch the release starts from, develop by default

## States

### Started

The branch exists and carries the version bump commit: version.txt written, the README version synced, and a changelog section prepended.

### Finished

The release has been merged into main and develop, tagged vX.Y.Z, and the branch has been deleted unless the Developer keeps it.
