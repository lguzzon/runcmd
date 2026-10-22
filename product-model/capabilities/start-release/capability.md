---
domain: high-level-operations
availability:
  - { place: git-flow-cli }
references:
  - kind: code
    role: implementation
    target: scripts/operations/release-utils.js#handleStart
---

# Start a release

Start a release branch from develop with the version ritual: resolve the new version from `--bump`, `--version`, or an interactive prompt; refuse an invalid or lower version, an existing branch, or a tag that already exists; then create the branch, write version.txt, sync the README version, prepend a changelog section, and commit the bump.
