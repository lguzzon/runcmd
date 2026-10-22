---
kind: primary
routes:
  cli: Git Flow helper
steps:
  - text: The Developer runs install with --auto-install on a machine without git-flow
    kind: actor
    actor: developer
    entities: []
    contexts:
      cli: { place: git-flow-cli }
  - text: The Product downloads the pinned gitflow installer, verifies its SHA256 against the pinned checksum, and installs it into the user's home directory
    kind: product
    actor: developer
    entities: []
  - text: Inside a repository, the Product initializes git-flow with default settings
    kind: product
    actor: developer
    entities: []
  - text: git-flow is available
    kind: condition
    entities: []
---

# Install git-flow

## Trigger

The Developer asks the CLI to ensure git-flow is installed.

## Outcome

git-flow is installed and, inside a repository, initialized.

## Edge cases

- Without --auto-install the CLI warns and does not install.
- A checksum mismatch on the installer aborts with an error.
- --offline refuses the install; --dry-run only prints.
- When the install directory is not on PATH, the CLI warns how to add it.
