---
type: cli
actors: [developer]
entryPoints:
  - cli: bun scripts/git-flow.js <command> [options]
  - cli: bun scripts/release-init.js [options]
  - cli: bun scripts/release-finalize.js [options]
references:
  - kind: code
    role: implementation
    target: scripts/cli.js#main
---

# Git Flow helper

The CLI that wraps git-flow with guarded branch commands — init, start, finish, publish, track, delete, list, config — and high-level operations: cloning with initialization, base-branch sync, and release/hotfix orchestration that bumps version.txt, syncs the README version, prepends a changelog section, and tags at finish. `release-init.js` and `release-finalize.js` are alternate entries for starting and finishing release/hotfix branches, the latter with automatic branch detection and an optional JSON summary.
