---
kind: primary
routes:
  cli: Git Flow helper
steps:
  - text: The Developer runs track with a branch type and name
    kind: actor
    actor: developer
    entities:
      - { entity: branch, effect: reads, facts: [Name, Type] }
    contexts:
      cli: { place: git-flow-cli }
  - text: The Product creates a local branch tracking the remote branch
    kind: product
    actor: developer
    entities:
      - { entity: branch, effect: creates, to: Started, facts: [Name, Type, Base branch] }
  - text: The branch is tracked locally
    kind: condition
    entities:
      - { entity: branch, effect: reads, facts: [] }
---

# Track a branch

## Trigger

The Developer tracks a remote branch locally.

## Outcome

A local branch tracks the remote branch.

## Edge cases

- --dry-run prints the actions without executing them.
