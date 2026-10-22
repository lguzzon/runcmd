---
kind: primary
routes:
  cli: Git Flow helper
steps:
  - text: The Developer runs delete with a branch type and name
    kind: actor
    actor: developer
    entities:
      - { entity: branch, effect: reads, facts: [Name, Type] }
    contexts:
      cli: { place: git-flow-cli }
  - text: The Product verifies the branch exists
    kind: product
    actor: developer
    entities:
      - { entity: branch, effect: reads, facts: [Name] }
  - text: The Product deletes the branch locally and remotely
    kind: product
    actor: developer
    entities:
      - { entity: branch, effect: removes, from: Started }
  - text: The branch no longer exists
    kind: condition
    entities:
      - { entity: branch, effect: reads, facts: [] }
---

# Delete a branch

## Trigger

The Developer deletes a branch.

## Outcome

The branch is gone locally and remotely.

## Edge cases

- --force deletes the branch even when it is not merged.
- --dry-run prints the actions without executing them.
