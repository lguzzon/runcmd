---
kind: primary
routes:
  cli: Git Flow helper
steps:
  - text: The Developer runs init in a repository
    kind: actor
    actor: developer
    entities: []
    contexts:
      cli: { place: git-flow-cli }
  - text: The Product verifies git-flow is available and initializes it with default settings
    kind: product
    actor: developer
    entities:
      - { entity: git-flow-configuration, effect: creates, facts: [Master branch, Develop branch, Feature prefix, Release prefix, Hotfix prefix, Support prefix] }
  - text: The Product prints the resulting configuration
    kind: product
    actor: developer
    entities:
      - { entity: git-flow-configuration, effect: reads, facts: [Master branch, Develop branch, Feature prefix, Release prefix, Hotfix prefix, Support prefix] }
---

# Initialize git-flow

## Trigger

The Developer initializes git-flow in the current repository.

## Outcome

git-flow is initialized with default settings and its configuration is printed.

## Edge cases

- Without git-flow available, init refuses with an error.
- --dry-run only prints the actions.
