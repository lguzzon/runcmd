---
availability:
  - { place: runner-unix }
  - { place: runner-windows }
references:
  - kind: code
    role: implementation
    target: runcmd.sh#ensure_bun_installed
  - kind: code
    role: implementation
    target: runcmd.bat#install_bun
---

# Install Bun

Ensure the Bun runtime is available for script execution: find it on PATH or in the local installation directory, and otherwise install it from the official source into the user's home directory.
