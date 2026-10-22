---
kind: primary
routes:
  cli: Git Flow helper
steps:
  - text: The Developer runs list, optionally with a branch type
    kind: actor
    actor: developer
    entities:
      - { entity: branch, effect: reads, facts: [Type] }
    contexts:
      cli: { place: git-flow-cli }
  - text: The Product lists the git-flow branches, grouped by type or filtered to the requested type
    kind: product
    actor: developer
    entities:
      - { entity: branch, effect: reads, facts: [Name, Type] }
  - text: The list shows the matching branches
    kind: condition
    entities:
      - { entity: branch, effect: reads, facts: [] }
---

# List branches

## Trigger

The Developer asks which git-flow branches exist.

## Outcome

The branches are listed, and a type with none reports that nothing was found.
