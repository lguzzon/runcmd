---
kind: primary
routes:
  windows: runcmd.bat
steps:
  - text: The Developer runs the runner against a .py script
    kind: actor
    actor: developer
    entities: []
    contexts:
      windows: { place: runner-windows }
  - text: The Product discovers the script among the supported .js, .mjs, .ts and .py extensions
    kind: product
    actor: developer
    entities: []
  - text: The Product runs the script through mise with the latest Python
    kind: product
    actor: developer
    entities: []
  - text: The runner exits with the script's exit code
    kind: condition
    entities: []
---

# Run a Python script

## Trigger

The Developer runs the Windows runner on a .py script.

## Outcome

The Python script ran through mise and the runner exited with its exit code.
