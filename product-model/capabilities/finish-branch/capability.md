---
domain: branch-commands
availability:
  - { place: git-flow-cli }
references:
  - kind: code
    role: implementation
    target: scripts/commands/finish.js#handleFinish
---

# Finish a branch

Finish a branch and merge it into its integration branches, optionally tagging, pushing, squashing, or keeping the branch. Release and hotfix finishes require a tag and a message.
