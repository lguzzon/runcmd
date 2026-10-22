---
kind: primary
routes:
  windows: runcmd.bat
steps:
  - text: The Developer runs the runner with --env naming a custom environment file
    kind: actor
    actor: developer
    entities: []
    contexts:
      windows: { place: runner-windows }
  - text: The Product loads the named file's variables on top of the default .env files
    kind: product
    actor: developer
    entities: []
  - text: The Product runs the target script with the combined environment
    kind: product
    actor: developer
    entities: []
  - text: The runner exits with the script's exit code
    kind: condition
    entities: []
---

# Run with a custom environment file

## Trigger

The Developer passes --env to load variables from a file other than the default .env files.

## Outcome

The script ran with the custom file's variables loaded.

## Edge cases

- A missing file path after --env is refused with a usage error.
- Lines that are comments, empty, or not KEY=VALUE pairs are skipped.
