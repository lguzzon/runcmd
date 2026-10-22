---
kind: primary
routes:
  cli: Git Flow helper
steps:
  - text: The Developer runs config with --list
    kind: actor
    actor: developer
    entities: []
    contexts:
      cli: { place: git-flow-cli }
  - text: The Product prints the master and develop names and every prefix
    kind: product
    actor: developer
    entities:
      - { entity: git-flow-configuration, effect: reads, facts: [Master branch, Develop branch, Feature prefix, Release prefix, Hotfix prefix, Support prefix] }
---

# Show the git-flow configuration

## Trigger

The Developer asks for the git-flow configuration.

## Outcome

The master branch, the develop branch, and the branch prefixes are printed.

## Edge cases

- With --get and a key, only that value is printed; an unknown key is reported as not found.
