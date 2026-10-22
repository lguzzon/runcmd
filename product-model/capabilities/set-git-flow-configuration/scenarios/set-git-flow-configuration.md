---
kind: primary
routes:
  cli: Git Flow helper
steps:
  - text: The Developer runs config with --set, a key, and a value
    kind: actor
    actor: developer
    entities: []
    contexts:
      cli: { place: git-flow-cli }
  - text: The Product writes the value into the git configuration
    kind: product
    actor: developer
    entities:
      - { entity: git-flow-configuration, effect: changes, facts: [Master branch, Develop branch, Feature prefix, Release prefix, Hotfix prefix, Support prefix] }
  - text: The new value is in effect for later git-flow operations
    kind: condition
    entities:
      - { entity: git-flow-configuration, effect: reads, facts: [] }
---

# Set a git-flow configuration value

## Trigger

The Developer sets a git-flow configuration key.

## Outcome

The key holds the new value.

## Edge cases

- --set without both a key and a value is refused with an error.
