---
availability:
  - { place: runner-unix }
  - { place: runner-windows }
references:
  - kind: code
    role: implementation
    target: runcmd.sh#run_check_mode
  - kind: code
    role: implementation
    target: runcmd.bat#check_mode
---

# Run checks

Run the runner's comprehensive check mode on the project. On Unix and macOS: format shell scripts (safely formatting the running runner itself with backup, syntax validation, and rollback), run shellcheck, sort JSON files, run oxfmt, and run oxlint. On Windows: run oxlint and oxfmt across the project.
