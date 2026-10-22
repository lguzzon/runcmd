---
kind: primary
routes:
  windows: runcmd.bat
steps:
  - text: The Developer runs the runner with +e
    kind: actor
    actor: developer
    entities: []
    contexts:
      windows: { place: runner-windows }
  - text: The Product prints every environment variable as currently set
    kind: product
    actor: developer
    entities: []
  - text: The runner exits successfully
    kind: condition
    entities: []
---

# List the environment variables

## Trigger

The Developer asks the Windows runner to list the environment.

## Outcome

Every environment variable is printed and nothing runs.
