---
kind: edge
routes:
  unix: runcmd.sh
  windows: runcmd.bat
steps:
  - text: At least seven days have passed since the last update check and the check is not disabled
    kind: condition
    unattended: true
    entities: []
    contexts:
      unix: { place: runner-unix }
      windows: { place: runner-windows }
  - text: The Product finds a newer published runner and downloads it with its checksum manifest
    kind: product
    entities: []
  - text: The manifest is missing or malformed, or the downloaded runner's SHA256 does not match its manifest entry
    kind: condition
    entities: []
  - text: The Product refuses the update and keeps the installed runner
    kind: product
    entities: []
---

# Refuse an unverified update

## Trigger

The weekly update check downloads a runner whose checksum cannot be verified.

## Outcome

The update is refused, the installed runner is unchanged, and the run continues with it.
