---
kind: primary
routes:
  unix: runcmd.sh
  windows: runcmd.bat
steps:
  - text: At least seven days have passed since the last update check and the check is not disabled
    kind: condition
    unattended: true
    entities: []
    contexts:
      unix: { place: runner-unix }
      windows: { place: runner-windows }
  - text: The Product fetches the published version and finds it newer than the installed one
    kind: product
    entities:
      - { entity: version, effect: reads, facts: [Version number] }
  - text: The Product downloads the published runner and its checksum manifest
    kind: product
    entities: []
  - text: The downloaded runner's SHA256 matches its manifest entry
    kind: condition
    entities: []
  - text: The Product replaces the running runner script and records the check in its state file
    kind: product
    entities: []
---

# Apply a verified update

## Trigger

The weekly, self-initiated update check finds a newer published version.

## Outcome

The running runner script is replaced by the verified newer version and the check is recorded.

## Edge cases

- RUNCMD_NO_UPDATE=1 skips the check entirely.
- A failed or timed-out fetch records the check, so the next attempt is no sooner than seven days later.
- A malformed published version is skipped and the check is recorded.
- On Windows the verified download is staged beside the runner, swapped in, and the runner restarts with the original arguments; a staged file at any other path is rejected.
