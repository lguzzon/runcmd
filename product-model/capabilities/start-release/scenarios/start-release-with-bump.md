---
kind: primary
routes:
  cli: Git Flow helper
steps:
  - text: The Developer starts a release, choosing a patch, minor, or major bump, an explicit one, or the interactive prompt
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
  - text: The Product verifies the vX.Y.Z tag and the release branch do not exist
    kind: product
    actor: developer
    entities:
      - { entity: release-branch, effect: reads, facts: [Name] }
  - text: The Product creates the release branch from develop
    kind: product
    actor: developer
    entities:
      - { entity: release-branch, effect: creates, to: Started, facts: [Name, Version, Base branch] }
  - text: The Product writes the new version into version.txt
    kind: product
    actor: developer
    entities:
      - { entity: version, effect: changes, facts: [Version number] }
  - text: The Product syncs the README badge and footer to the bumped number
    kind: product
    actor: developer
    entities:
      - { entity: readme, effect: changes, facts: [Version badge, Footer version] }
  - text: The Product prepends a release section to the changelog
    kind: product
    actor: developer
    entities:
      - { entity: changelog, effect: changes, facts: [Release sections] }
  - text: The Product commits the bump, staging version.txt, CHANGELOG.md and README.md
    kind: product
    actor: developer
    entities:
      - { entity: version, effect: reads, facts: [] }
      - { entity: changelog, effect: reads, facts: [] }
      - { entity: readme, effect: reads, facts: [] }
  - text: The release branch is started with its bump committed and checked out
    kind: condition
    entities:
      - { entity: release-branch, effect: reads, facts: [] }
---

# Start a release with a version bump

## Trigger

The Developer starts a release.

## Outcome

A release branch exists from develop carrying the bumped version, the synced README, and the new changelog section, committed.

## Edge cases

- --name overrides the vX.Y.Z branch suffix; a missing prefix is added.
- --push pushes the new branch; --offline skips the base pull; --dry-run prints every command.
- --no-changelog skips the changelog update.
- Without --yes, the Developer confirms the bumped version or enters a custom one interactively.
- An explicit --version overrides the bump; release-init defaults to a minor bump.
