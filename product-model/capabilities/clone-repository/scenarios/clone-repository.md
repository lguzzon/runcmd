---
kind: primary
routes:
  cli: Git Flow helper
steps:
  - text: The Developer clones a repository URL, optionally naming a target directory
    kind: actor
    actor: developer
    entities: []
    contexts:
      cli: { place: git-flow-cli }
  - text: The Product clones the repository into the target directory, defaulting to the repository name
    kind: product
    actor: developer
    entities: []
  - text: The Product initializes git-flow in the clone with default settings
    kind: product
    actor: developer
    entities:
      - { entity: git-flow-configuration, effect: creates, facts: [Master branch, Develop branch, Feature prefix, Release prefix, Hotfix prefix, Support prefix] }
  - text: The clone is ready for git-flow work
    kind: condition
    entities: []
---

# Clone a repository

## Trigger

The Developer clones a repository to work on it with git-flow.

## Outcome

The repository is cloned with git-flow initialized.

## Edge cases

- --dry-run prints the actions without executing them.
- Without git-flow available, clone refuses with an error.
