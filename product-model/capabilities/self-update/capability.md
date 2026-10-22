---
availability:
  - { place: runner-unix }
  - { place: runner-windows }
references:
  - kind: code
    role: implementation
    target: runcmd.sh#check_for_updates
  - kind: code
    role: implementation
    target: runcmd-update.js#main
---

# Self-update

Check at most every seven days for a newer published version of the runner; when one exists, download the new runner script, verify its SHA256 against the published checksum manifest, and replace the running runner. The check is skipped when `RUNCMD_NO_UPDATE=1`.
