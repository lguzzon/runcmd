---
kind: validation
routes:
  unix: runcmd.sh
steps:
  - text: The Developer runs the runner with +r naming a path that exists but does not end in .mjs
    kind: actor
    actor: developer
    entities: []
    contexts:
      unix: { place: runner-unix }
  - text: The Product refuses the path and exits with an error
    kind: product
    actor: developer
    entities: []
---

# Refuse a non-module script

## Trigger

The Developer points the Unix runner at a file that is not an .mjs script.

## Outcome

The runner refused the path and nothing ran.

## Edge cases

- A default script that exists in neither the current nor the runner's directory is refused the same way.
