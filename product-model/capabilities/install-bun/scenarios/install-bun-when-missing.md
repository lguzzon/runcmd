---
kind: primary
routes:
  unix: runcmd.sh
  windows: runcmd.bat
steps:
  - text: The Developer runs the runner on a machine where Bun is not installed
    kind: actor
    actor: developer
    entities: []
    contexts:
      unix: { place: runner-unix }
      windows: { place: runner-windows }
  - text: The Product looks for Bun on PATH and in the local installation directory and finds neither
    kind: condition
    entities: []
  - text: The Product downloads the official Bun installer over TLS, rejects a download that is not the installer, and installs Bun into the user's home directory
    kind: product
    actor: developer
    entities: []
  - text: Bun is available for the rest of the run
    kind: condition
    entities: []
---

# Install Bun when missing

## Trigger

The Developer runs the runner on a machine without Bun.

## Outcome

Bun is installed and the script runs; a failed or invalid installer aborts the run with an error.

## Edge cases

- On Unix a missing curl is installed first via the available package manager (apt-get, yum, or brew); with no supported package manager the run aborts.
- When the installation completes but Bun remains unavailable, the run aborts and asks for PATH to be fixed.
