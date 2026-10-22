---
domain: branch-commands
availability:
  - { place: git-flow-cli }
references:
  - kind: code
    role: implementation
    target: scripts/commands/start.js#handleStart
---

# Start a branch

Start a new feature, release, hotfix, or support branch from its base — develop for feature and release, main for hotfix and support, or an explicit base — after verifying a clean tree, a valid name, and that the branch does not exist yet.
