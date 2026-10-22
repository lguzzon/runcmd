---
type: cli
actors: [developer]
entryPoints:
  - cli: runcmd.bat [options] [arguments]
references:
  - kind: code
    role: implementation
    target: runcmd.bat
---

# runcmd.bat

The Windows runner. It loads `.env` files plus an optional custom `--env` file, checks weekly for a verified self-update, discovers the target script among `.js`, `.mjs`, `.ts` and `.py` files in the current directory, the runner's own directory, or an explicit `+r` path, ensures Bun is installed (Python scripts run through mise), and runs the script. Options cover four debug levels, environment variable listing with `+e`, a `+check` mode running oxlint and oxfmt, help, and version display.

## Intent

The same runner contract as `runcmd.sh`, adapted to Windows batch: run scripts without setup.
