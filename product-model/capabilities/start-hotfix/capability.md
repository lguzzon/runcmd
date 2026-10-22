---
domain: high-level-operations
availability:
  - { place: git-flow-cli }
references:
  - kind: code
    role: implementation
    target: scripts/operations/release-utils.js#handleStart
---

# Start a hotfix

Start a hotfix branch from main with the same version ritual as a release: resolve the new version (defaulting to a patch bump), refuse an invalid or lower version, an existing branch, or a tag that already exists; then create the branch, write version.txt, sync the README version, prepend a changelog section, and commit the bump.
