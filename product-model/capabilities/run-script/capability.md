---
availability:
  - { place: runner-unix }
  - { place: runner-windows }
references:
  - kind: code
    role: implementation
    target: runcmd.sh#execute_script
  - kind: code
    role: implementation
    target: runcmd.bat#attempt_script_execution
---

# Run a script

Discover or select a script, load `.env` variables, ensure Bun is installed, run the script with Bun (Python scripts through mise on Windows), pass through the remaining arguments, and propagate the script's exit code.
