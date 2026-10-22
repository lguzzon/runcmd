---
domain: branch-commands
availability:
  - { place: git-flow-cli }
references:
  - kind: code
    role: implementation
    target: scripts/commands/delete.js
---

# Delete a branch

Delete a branch locally; --force deletes it even when it is not merged. The remote copy is not touched by default — the underlying git-flow `delete` only removes it when given its `-r` flag, which this command does not forward.
