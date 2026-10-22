---
kind: primary
routes:
  unix: runcmd.sh
  windows: runcmd.bat
steps:
  - text: The Developer runs the runner with +version or +v
    kind: actor
    actor: developer
    entities:
      - { entity: version, effect: reads, facts: [Version number] }
    contexts:
      unix: { place: runner-unix }
      windows: { place: runner-windows }
  - text: The Product reads version.txt beside the runner and prints the version
    kind: product
    actor: developer
    entities:
      - { entity: version, effect: reads, facts: [Version number] }
  - text: The runner exits successfully
    kind: condition
    entities: []
---

# Show the runner version

## Trigger

The Developer asks the runner for its version.

## Outcome

The version from version.txt is printed and nothing runs.
