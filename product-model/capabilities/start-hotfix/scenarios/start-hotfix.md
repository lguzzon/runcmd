---
kind: primary
routes:
  cli: Git Flow helper
steps:
  - text: The Developer starts a hotfix, accepting the patch bump, choosing a bump, or passing an explicit one
    kind: actor
    actor: developer
    entities: []
    contexts:
      cli: { place: git-flow-cli }
  - text: The Product reads the current version and resolves the new one, refusing one that is invalid or lower than the current one
    kind: product
    actor: developer
    entities:
      - { entity: version, effect: reads, facts: [Version number] }
  - text: The Product verifies the vX.Y.Z tag and the hotfix branch do not exist
    kind: product
    actor: developer
    entities:
      - { entity: hotfix-branch, effect: reads, facts: [Name] }
  - text: The Product creates the hotfix branch from main
    kind: product
    actor: developer
    entities:
      - { entity: hotfix-branch, effect: creates, to: Started, facts: [Name, Version, Base branch] }
  - text: The Product writes the new version into version.txt, syncs the README badge and footer, and prepends a section to the changelog
    kind: product
    actor: developer
    entities:
      - { entity: version, effect: changes, facts: [Version number] }
      - { entity: readme, effect: changes, facts: [Version badge, Footer version] }
      - { entity: changelog, effect: changes, facts: [Release sections] }
  - text: The Product commits the bump
    kind: product
    actor: developer
    entities: []
  - text: The hotfix branch is started with its bump committed and checked out
    kind: condition
    entities:
      - { entity: hotfix-branch, effect: reads, facts: [] }
---

# Start a hotfix with a version bump

## Trigger

The Developer starts a hotfix.

## Outcome

A hotfix branch exists from main carrying the bumped version, the synced README, and the new changelog section, committed.

## Edge cases

- --push pushes the new branch; --offline skips the base pull; --dry-run prints every command; --no-changelog skips the changelog update.
- An existing tag, an existing hotfix branch, an invalid or lower version, or a dirty working tree is refused with an error.
