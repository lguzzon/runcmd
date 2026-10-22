---
kind: primary
routes:
  windows: runcmd.bat
steps:
  - text: The Developer runs the runner with +check
    kind: actor
    actor: developer
    entities: []
    contexts:
      windows: { place: runner-windows }
  - text: The Product runs oxlint with automatic fixes over the project
    kind: product
    actor: developer
    entities: []
  - text: The Product checks formatting with oxfmt over the project
    kind: product
    actor: developer
    entities: []
  - text: The runner exits with an error when either check reported issues
    kind: condition
    entities: []
---

# Run the Windows checks

## Trigger

The Developer runs the Windows runner's +check mode.

## Outcome

oxlint and oxfmt have run across the project and a failure in either fails the run.

## Edge cases

- When bunx is unavailable, all checks are skipped and the run succeeds.
