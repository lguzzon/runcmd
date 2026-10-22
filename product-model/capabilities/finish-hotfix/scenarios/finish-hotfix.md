---
kind: primary
routes:
  cli: Git Flow helper
steps:
  - text: The Developer finishes the hotfix with a tag and a message
    kind: actor
    actor: developer
    entities: []
    contexts:
      cli: { place: git-flow-cli }
  - text: The Product verifies a clean tree, that main and develop exist, that the hotfix branch exists, and that the tag is new, pulling the latest branches unless offline
    kind: product
    actor: developer
    entities:
      - { entity: hotfix-branch, effect: reads, facts: [Name] }
  - text: The Product merges the hotfix into main, tags it vX.Y.Z, and merges main back into develop
    kind: product
    actor: developer
    entities:
      - { entity: hotfix-branch, effect: changes, from: Started, to: Finished, facts: [Tag] }
  - text: The hotfix is finished and the hotfix branch is deleted
    kind: condition
    entities:
      - { entity: hotfix-branch, effect: reads, facts: [] }
---

# Finish a hotfix

## Trigger

The Developer finishes a hotfix branch.

## Outcome

The hotfix is merged into main and tagged, main is merged back into develop, and the branch is deleted.

## Edge cases

- --keep-branch keeps the branch after finishing.
- --push pushes branches and tags, and is ignored offline.
- --dry-run prints the actions without executing them.
