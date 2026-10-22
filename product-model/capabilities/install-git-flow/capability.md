---
domain: core-commands
availability:
  - { place: git-flow-cli }
references:
  - kind: code
    role: implementation
    target: scripts/lib/installer.js#ensureGitFlowAvailable
---

# Install git-flow

Ensure git-flow is available on the machine; when it is missing and installation is allowed, install the pinned gitflow-cjs release with the SHA256-verified installer script into the user's home directory, and initialize git-flow when inside a repository.
