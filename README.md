<div align="center">

# runcmd

### Zero-config runner for Bun scripts. Drop the file, run the file.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.11.2-blue)](version.txt)

[Install](#install) · [See It Work](#see-it-work) · [Getting Started](#getting-started) · [Docs](https://lguzzon.github.io/runcmd)

</div>

---

> [!IMPORTANT]
> **What runcmd touches:** Installs Bun to `~/.bun`. Creates a state file at `~/.runcmd/state.json`. Makes weekly network calls to `lguzzon.github.io/runcmd/version.txt` to check for updates (disable with `RUNCMD_NO_UPDATE=1`). Runs shell commands you provide. Uninstall by deleting `~/.bun`, `~/.runcmd`, and the runner file.

---

## The Problem

You write a `.mjs` script. Now you need Bun installed, `.env` loaded, tools wired up, arguments parsed — the boilerplate that has nothing to do with your logic.

If you have used `npx` or `bunx` to run ad-hoc packages, you already know the convenience. runcmd is the same idea for your own scripts: it wraps Bun installation, path resolution, environment loading, and development tooling into one file.

What's different: no package.json, no `npm install`, no config. Copy the runner, write your `.mjs`, run it.

---

## See It Work

```bash
# Download the runner
curl -fsSL https://lguzzon.github.io/runcmd/runcmd.sh -o runcmd.sh
chmod +x runcmd.sh

# Create a script
echo 'console.log("hello from runcmd");' > runcmd.mjs

# Run it
./runcmd.sh
# hello from runcmd
```

That installed Bun, loaded your script, and ran it. One command.

---

## Install

```bash
curl -fsSL https://lguzzon.github.io/runcmd/runcmd.sh -o runcmd.sh
chmod +x runcmd.sh
```

<details>
<summary><b>Windows</b> — runcmd.bat</summary>

Save [`runcmd.bat`](https://lguzzon.github.io/runcmd/runcmd.bat) to your project directory and run:

```cmd
runcmd.bat
runcmd.bat +d      # debug mode
runcmd.bat +check  # format and lint
```

</details>

<details>
<summary><b>Alternative runtimes</b> — rename the runner</summary>

Copy `runcmd.sh` to any name. It automatically discovers the matching `.mjs` file:

```bash
cp runcmd.sh build.sh
# Now writes build.mjs and runs it with ./build.sh
```

</details>

---

## Getting Started

### Run your script

```bash
./runcmd.sh                         # Run runcmd.mjs
./runcmd.sh +debug                  # Enable timing and verbose logs
./runcmd.sh +r ./path/to/app.mjs    # Run a different script
```

### Format and lint

```bash
./runcmd.sh +check                  # Run all quality checks
```

This formats shell scripts with `shfmt`, sorts JSON, lints with `oxlint`, and formats JS/TS with `oxfmt` — all through `bunx`, auto-installed on first use.

### Use environment variables

runcmd loads `.env` from the script directory, then from the current directory (overrides allowed):

```bash
# .env file
DB_HOST=localhost
DB_PORT=5432
```

---

## How It Works

The runner script (`runcmd.sh` / `runcmd.bat`) handles everything except your logic:

```text
runcmd.sh
  ↓ Detect Bun (install to ~/.bun if missing)
  ↓ Load .env files (script dir → current dir)
  ↓ Resolve target script (+r flag → cwd → runner dir)
  ↓ Execute .mjs with args forwarded
  ↓ Propagate exit code
```

<details>
<summary><b>Script resolution order</b></summary>

1. `+r <path>` flag — explicit path
2. `<runner>.mjs` in the current directory
3. `<runner>.mjs` in the runner's own directory

</details>

<details>
<summary><b>Debug levels</b></summary>

| Flag | Level | Detail |
|------|-------|--------|
| `+debug` or `DEBUG=1` | Basic | Execution flow timing |
| `+dd` | File ops | + file read/write tracing |
| `+ddd` | Full echo | All operations |
| `+d0` | Off | Disable debug |

</details>

---

## Git Flow Integration

The `scripts/` directory contains a git-flow automation CLI:

```bash
bun scripts/git-flow.js start feature new-auth
bun scripts/git-flow.js finish feature new-auth
bun scripts/git-flow.js release start --bump minor
```

<details>
<summary><b>All git-flow commands</b></summary>

| Command | Description |
|---------|-------------|
| `init` | Initialize git-flow |
| `start <type> <name>` | Create feature/release/hotfix |
| `finish <type> <name>` | Merge to develop/main |
| `publish <type> <name>` | Push branch to remote |
| `delete <type> <name>` | Delete branch |
| `release start --bump <ver>` | Create release branch |
| `hotfix finish --tag <v>` | Complete hotfix |
| `sync --dry-run` | Preview main/develop sync |
| `clone <url> [dir]` | Clone and init git-flow |

</details>

---

## Project Structure

```text
runcmd/
├── runcmd.sh           # Unix/macOS runner
├── runcmd.bat          # Windows runner
├── runcmd.mjs          # Default target script
├── version.txt         # Current version
├── CHANGELOG.md        # Release history
├── LICENSE             # MIT
├── scripts/            # Git-flow automation
│   ├── git-flow.js
│   ├── commands/       # Branch operations
│   ├── lib/            # Shared utilities
│   └── operations/     # Release/hotfix/sync
├── website/            # Astro documentation site
│   ├── src/
│   └── package.json
└── .github/workflows/  # CI/CD
```

## Configuration

| Variable | Effect | Default |
|----------|--------|---------|
| `DEBUG` | Enable debug logging | `0` |
| `RUNCMD_NO_UPDATE` | Disable auto-update checks | `0` |
| `RUNCMD_HOME` | State directory path | `~/.runcmd` |

## Requirements

- **Unix/macOS:** Bash 4.0+, curl
- **Windows:** Batch-compatible shell

Everything else (Bun, oxlint, oxfmt, shfmt, json-sort-cli) is auto-installed.

## Contributing

1. Fork the repo
2. Create a feature branch
3. Run `./runcmd.sh +check` to verify code quality
4. Submit a PR

## License

MIT — see [LICENSE](LICENSE).

---

*Version 1.11.2*
