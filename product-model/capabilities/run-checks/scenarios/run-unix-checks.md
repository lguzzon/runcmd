---
kind: primary
routes:
  unix: runcmd.sh
steps:
  - text: The Developer runs the runner with +check
    kind: actor
    actor: developer
    entities: []
    contexts:
      unix: { place: runner-unix }
  - text: The Product ensures Bun is installed
    kind: product
    actor: developer
    entities: []
  - text: The Product formats the shell scripts in the target and current directories, formatting the running runner itself through a backup, syntax validation, and rollback-protected replacement
    kind: product
    actor: developer
    entities: []
  - text: The Product runs shellcheck on the shell scripts, reporting warnings without blocking
    kind: product
    actor: developer
    entities: []
  - text: The Product sorts the JSON files and runs oxfmt over the target directory
    kind: product
    actor: developer
    entities: []
  - text: The Product runs oxlint on the target script and exits with an error when it fails
    kind: product
    actor: developer
    entities: []
---

# Run the Unix checks

## Trigger

The Developer runs the Unix runner's +check mode.

## Outcome

Shell scripts are formatted, JSON files sorted, and the JavaScript files linted; only an oxlint failure fails the run.

## Edge cases

- Shell formatting, shellcheck, JSON sorting, and oxfmt failures are reported but do not stop the remaining checks.
