---
kind: primary
routes:
  cli: Git Flow helper
steps:
  - text: The Developer runs start with a branch type and name
    kind: actor
    actor: developer
    entities:
      - { entity: branch, effect: reads, facts: [Name, Type] }
    contexts:
      cli: { place: git-flow-cli }
  - text: The Product verifies a clean tree, a valid name, that the base branch exists, and that the target branch does not
    kind: product
    actor: developer
    entities:
      - { entity: branch, effect: reads, facts: [Name, Base branch] }
  - text: The Product starts the branch from develop for a feature or release, from main for a hotfix or support branch, or from an explicit --base
    kind: product
    actor: developer
    entities:
      - { entity: branch, effect: creates, to: Started, facts: [Name, Type, Base branch] }
  - text: The new branch is checked out
    kind: condition
    entities:
      - { entity: branch, effect: reads, facts: [] }
---

# Start a branch

## Trigger

The Developer starts a feature, release, hotfix, or support branch.

## Outcome

The branch exists and the Developer is switched to it.

## Edge cases

- --fetch pulls the base branch first, unless --offline.
- --force deletes an existing branch of the same name before starting.
- --dry-run prints the actions without executing them.
