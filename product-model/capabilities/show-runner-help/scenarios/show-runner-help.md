---
kind: primary
routes:
  unix: runcmd.sh
  windows: runcmd.bat
steps:
  - text: The Developer runs the runner with +help or +h
    kind: actor
    actor: developer
    entities: []
    contexts:
      unix: { place: runner-unix }
      windows: { place: runner-windows }
  - text: The Product prints the usage, options, and examples
    kind: product
    actor: developer
    entities: []
  - text: The runner exits successfully
    kind: condition
    entities: []
---

# Show runner help

## Trigger

The Developer asks the runner for help.

## Outcome

The usage text is printed and nothing runs.
