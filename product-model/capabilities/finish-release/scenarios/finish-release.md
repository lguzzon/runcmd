---
kind: primary
routes:
  cli: Git Flow helper
steps:
  - text: The Developer finishes the release with a tag and a message
    kind: actor
    actor: developer
    entities: []
    contexts:
      cli: { place: git-flow-cli }
  - text: The Product verifies a clean tree, that main and develop exist, that the release branch exists, and that the tag is new, pulling the latest branches unless offline
    kind: product
    actor: developer
    entities:
      - { entity: release-branch, effect: reads, facts: [Name] }
  - text: The Product merges the release into main and develop and tags it vX.Y.Z
    kind: product
    actor: developer
    entities:
      - { entity: release-branch, effect: changes, from: Started, to: Finished, facts: [Tag] }
  - text: The release is finished and the release branch is deleted
    kind: condition
    entities:
      - { entity: release-branch, effect: reads, facts: [] }
---

# Finish a release

## Trigger

The Developer finishes a release branch.

## Outcome

The release is merged into its integration branches and tagged; the branch is deleted.

## Edge cases

- --keep-branch keeps the branch after finishing.
- --push pushes branches and tags, and is ignored offline.
- --dry-run prints the actions without executing them.
- release-finalize detects the release or hotfix branch automatically, prompting when several exist, requires the branch name to carry a version, and with --json prints a JSON summary.
