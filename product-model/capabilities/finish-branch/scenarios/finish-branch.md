---
kind: primary
routes:
  cli: Git Flow helper
steps:
  - text: The Developer runs finish with a branch type and name
    kind: actor
    actor: developer
    entities:
      - { entity: branch, effect: reads, facts: [Name, Type] }
    contexts:
      cli: { place: git-flow-cli }
  - text: The Product verifies a clean tree and that the branch exists, and pulls the latest changes unless --offline
    kind: product
    actor: developer
    entities:
      - { entity: branch, effect: reads, facts: [Name] }
  - text: The Product merges the branch into its integration branches and deletes it
    kind: product
    actor: developer
    entities:
      - { entity: branch, effect: changes, from: Started, to: Finished, facts: [] }
  - text: The branch is finished
    kind: condition
    entities:
      - { entity: branch, effect: reads, facts: [] }
---

# Finish a branch

## Trigger

The Developer finishes a branch.

## Outcome

The branch is merged into its integration branches and deleted.

## Edge cases

- Finishing a release or hotfix requires --tag and --message, and the tag must not exist.
- --push pushes branches and tags after finishing; offline it is ignored.
- --squash squashes the merge; --keep-branch keeps the branch.
- --dry-run prints the actions without executing them.
