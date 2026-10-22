---
kind: primary
routes:
  unix: runcmd.sh
  windows: runcmd.bat
steps:
  - text: The Developer runs the runner with the +r override naming a script path, a directory, or a filename
    kind: actor
    actor: developer
    entities: []
    contexts:
      unix: { place: runner-unix }
      windows: { place: runner-windows }
  - text: The Product resolves the override — a direct path, a path beside the current directory, a path beside the runner, or the runner's own script name inside a directory
    kind: product
    actor: developer
    entities: []
  - text: The Product runs the resolved script with Bun, passing through the remaining arguments
    kind: product
    actor: developer
    entities: []
  - text: The runner exits with the script's exit code
    kind: condition
    entities: []
---

# Run an explicit script

## Trigger

The Developer points the runner at a specific script with the +r option.

## Outcome

The requested script ran under Bun and the runner exited with its exit code.

## Edge cases

- On Windows the first bare argument that is an existing file runs directly, after the current and runner directories have been searched.
- On Unix a resolved path that is not an .mjs file is refused.
