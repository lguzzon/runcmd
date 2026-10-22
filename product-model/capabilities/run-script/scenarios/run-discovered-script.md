---
kind: primary
routes:
  unix: runcmd.sh
  windows: runcmd.bat
steps:
  - text: The Developer runs the runner with no script path
    kind: actor
    actor: developer
    entities: []
    contexts:
      unix: { place: runner-unix }
      windows: { place: runner-windows }
  - text: The Product loads environment variables from the .env files beside the runner and in the current directory, the current directory taking precedence
    kind: product
    actor: developer
    entities: []
  - text: The Product resolves the target script, looking beside the current directory first and beside the runner second
    kind: product
    actor: developer
    entities: []
  - text: The Product ensures Bun is installed, installing it when missing
    kind: product
    actor: developer
    entities: []
  - text: The Product runs the script with Bun, passing through the remaining arguments
    kind: product
    actor: developer
    entities: []
  - text: The runner exits with the script's exit code
    kind: condition
    entities: []
---

# Run the discovered script

## Trigger

The Developer runs the runner with no script path or override.

## Outcome

The discovered script ran under Bun with the .env variables loaded, and the runner exited with the script's exit code.

## Edge cases

- With debug enabled (+debug or DEBUG=1), the runner prints operational detail and the elapsed time.
- Debug can be forced off with +nodebug or +d0, overriding the DEBUG environment variable.
