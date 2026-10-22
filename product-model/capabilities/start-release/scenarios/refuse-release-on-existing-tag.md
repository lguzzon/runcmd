---
kind: validation
routes:
  cli: Git Flow helper
steps:
  - text: The Developer starts a release whose vX.Y.Z tag already exists
    kind: actor
    actor: developer
    entities: []
    contexts:
      cli: { place: git-flow-cli }
  - text: The vX.Y.Z tag already exists
    kind: condition
    entities: []
  - text: The Product refuses and exits with an error, leaving nothing started
    kind: product
    actor: developer
    entities: []
---

# Refuse a release on an existing tag

## Trigger

The Developer starts a release for a version that was already tagged.

## Outcome

Nothing is started and no branch is created.

## Edge cases

- An existing release branch, an invalid version, a version lower than the current one, or a dirty working tree is refused the same way.
