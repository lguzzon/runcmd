---
type: cli
actors: [developer]
entryPoints:
  - cli: ./runcmd.sh [options] [arguments]
references:
  - kind: code
    role: implementation
    target: runcmd.sh
---

# runcmd.sh

The Unix and macOS runner. It loads `.env` files, checks weekly for a verified self-update, resolves the target `.mjs` script from the current directory, the runner's own directory, or an explicit `+r` path, ensures Bun is installed, and runs the script with Bun. Options cover debug logging with execution timing, a comprehensive `+check` mode (shell formatting and shellcheck, JSON sorting, oxfmt, oxlint), help, and version display.

## Intent

Run a script anywhere without package.json, npm install, or configuration: copy the runner, write the `.mjs` beside it, run it.
