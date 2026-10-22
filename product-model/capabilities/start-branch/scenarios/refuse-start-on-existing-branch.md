---
kind: validation
routes:
  cli: Git Flow helper
steps:
  - text: The Developer runs start with a type and name whose branch already exists
    kind: actor
    actor: developer
    entities:
      - { entity: branch, effect: reads, facts: [Name, Type] }
    contexts:
      cli: { place: git-flow-cli }
  - text: A branch of that name already exists and --force was not given
    kind: condition
    entities:
      - { entity: branch, effect: reads, facts: [Name] }
  - text: The Product refuses and exits with an error
    kind: product
    actor: developer
    entities: []
---

# Refuse to start over an existing branch

## Trigger

The Developer starts a branch that already exists without --force.

## Outcome

Nothing is started and the existing branch is untouched.

## Edge cases

- A dirty working tree, an invalid name, or a missing base branch is refused the same way.
