---
kind: primary
routes:
  cli: Git Flow helper
steps:
  - text: The Developer runs publish with a branch type and name
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
  - text: The Product publishes the branch to the remote repository
    kind: product
    actor: developer
    entities:
      - { entity: branch, effect: changes, from: Started, to: Published, facts: [] }
  - text: The branch is published
    kind: condition
    entities:
      - { entity: branch, effect: reads, facts: [] }
---

# Publish a branch

## Trigger

The Developer publishes a branch.

## Outcome

The branch exists on the remote repository.

## Edge cases

- --dry-run prints the actions without executing them.
