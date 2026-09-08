# runcmd

Universal Bun-based script runner with auto-installation, cross-platform support, integrated development tooling, and git-flow management. Separates boilerplate from business logic via runner scripts handling Bun installation, path resolution, `.env` loading, and tooling integration.

---

## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

---

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

---

## NXTG-Forge

This project uses NXTG-Forge for AI-powered development governance.

- **Vision:** Universal Bun-based script runner with auto-install, cross-platform support, and integrated dev tooling
- **Goals:** Ship working MVP, High test coverage, Clean architecture
- **Commands:** Type /forge: to see available Forge commands
- **Governance:** Project state tracked in .claude/governance.json

---

## Project Overview

`runcmd` is a universal script runner that simplifies execution of JavaScript/TypeScript files using the Bun runtime. The key innovation is that platform-specific shell scripts (`runcmd.sh` for Unix/macOS, `runcmd.bat` for Windows) manage the Bun installation, environment setup, and integrated tooling (formatting/linting), while a target `.mjs` file contains the actual script logic.

### Architecture

The project has three core runner files:

1. **runcmd.sh** (1155 lines): Unix/macOS bash script with comprehensive features
2. **runcmd.bat** (610 lines): Windows batch equivalent
3. **runcmd.mjs**: Target script that the runner executes (this is the user's actual script)

The runners are designed to be copied and the `.mjs` file modified to contain your script logic. The runner scripts handle all boilerplate.

```text
Runner Script (runcmd.sh/runcmd.bat)
    ↓
Script Resolution: explicit +r flag → current dir .mjs → script dir .mjs
    ↓
Environment Loading: script_dir .env → current_dir .env (overwrites)
    ↓
Tooling: Bun auto-install → oxlint/oxfmt/shfmt/json-sort-cli (on +check)
    ↓
Update Check: 7-day interval, version.txt comparison, self-update
```

### Script Resolution

The runners automatically discover the target script:

1. First look for `<runner_name>.mjs` in the current working directory
2. Fall back to `<runner_name>.mjs` in the same directory as the runner script
3. Override with `+r <path>` flag (sh) or pass path as argument (bat)

Example: If you copy `runcmd.sh` to `myscript.sh`, it will look for `myscript.mjs`.

## Common Commands

### Running Scripts

```bash
# Unix/macOS
./runcmd.sh                          # Run default runcmd.mjs
./runcmd.sh +debug                   # Run with debug logging and timing
./runcmd.sh +r ./src/app.mjs dev     # Run specific script with arguments
DEBUG=1 ./runcmd.sh                  # Alternative: Enable debug via env var

# Windows
runcmd.bat                           # Run default runcmd.mjs
runcmd.bat +d                        # Run with debug logging
runcmd.bat +e                        # List all environment variables
runcmd.bat --env custom.env          # Load custom .env file
```

### Code Quality Checks

```bash
# Comprehensive check mode (shell format, shellcheck, JSON sort, oxlint, oxfmt)
./runcmd.sh +check

# Manually run tools
bunx oxlint --fix-dangerously .     # Lint JS/TS files
bunx oxfmt --write .                 # Format JS/TS files
bunx shfmt -w -bn -ci -i 2 -s *.sh   # Format shell scripts
shellcheck -s bash *.sh               # Check shell scripts
bunx json-sort-cli "**/*.json"       # Sort JSON files
```

### Lint/Format Requirements

Every file edit SHOULD pass format and lint rules before commit. The pre-commit hook (`.githooks/pre-commit`) runs checks non-blocking (warns on failure, does not block commit):

- **shellcheck** on `.sh` files (warnings only)
- **oxlint --fix-dangerously** on JS/TS files
- Re-adds all staged files after auto-fixes

Run manually after any edit:

```bash
bunx oxfmt --write . && bunx oxlint --fix-dangerously .
shellcheck -s bash runcmd.sh
```

### Environment Variables

The `.env` files are automatically loaded (script directory `.env` loaded first, then current directory `.env` can override):

```bash
# .env files are parsed for KEY=VALUE pairs
# Format:
VAR1=value1
VAR2=value2
# Comments start with #
```

---

## Script Features

### runcmd.sh (Unix/macOS)

Key capabilities:

- **Automatic Bun Installation**: Detects and installs Bun to `$HOME/.bun` if missing
- **Safe Self-Formatting**: Can format its own source file using atomic operations with rollback protection
- **Cross-Platform Path Resolution**: Uses `greadlink` (macOS), `readlink` (Linux), or Python fallback
- **Multiple Search Paths**: Checks current directory, script directory, and explicit paths
- **Timing Functionality**: Debug mode includes millisecond-precision execution timing with Python
- **Tool Dependencies**: Auto-installs through `bunx`: `oxlint`, `oxfmt`, `shfmt`, `json-sort-cli`
- **Exit Code Propagation**: Returns the exit code from the executed `.mjs` script

Script resolution priority (`+r <path>` flag):

1. Empty → use default script resolution
2. Directory path → look for `<scriptname>.mjs` in that directory
3. Filename → try direct path, `./<filename>`, `./scriptdir/<filename>`
4. Validates file ends with `.mjs`

### runcmd.bat (Windows)

Key capabilities:

- **Multiple File Types**: Supports `.js`, `.mjs`, `.ts`, and `.py` files
- **Integrated Tool Discovery**: Checks PATH, local installation (`%USERPROFILE%\.bun\bin`), or auto-installs
- **Python Execution**: Uses `mise exec python@latest` for `.py` files
- **Enhanced Debug Modes**: `+d` (basic), `+dd` (with file ops), `+ddd` (full echo), `+d0` (disable)
- **Delayed Variable Expansion**: Enables complex string operations

Script resolution priority:

1. Current working directory with each supported extension
2. Script directory with each supported extension
3. Explicit path passed as first argument

---

## Patterns

- **Script Discovery:** Explicit path → current directory → runner directory fallback chain
- **Environment Override:** Current directory `.env` takes precedence over script directory
- **Debug Levels:** `+d` (basic), `+dd` (file ops), `+ddd` (full echo), `+d0` (disabled)
- **Update Mechanism:** State file at `$HOME/.runcmd/state.json`, compares semantic versions

## Behavioral Contracts

- **Update URL:** `https://lguzzon.github.io/runcmd/version.txt`
- **State file:** `$HOME/.runcmd/state.json`
- **Check interval:** `7 * 24 * 3600` seconds
- **Bun install:** `$HOME/.bun` via `https://bun.sh/install`
- **shfmt flags:** `-bn -ci -i 2 -s`
- **.env regex:** `^[A-Za-z_][A-Za-z0-9_]*=`
- **Version format:** Semantic (x.y.z), no leading zeros

## Git-Flow Commands

Accessible via `bun scripts/git-flow.js`:

| Command                                         | Action                               |
| ----------------------------------------------- | ------------------------------------ |
| `init`                                          | Initialize git-flow                  |
| `start <type> <name>`                           | Create feature/release/hotfix branch |
| `finish <type> <name>`                          | Merge branch to develop/main         |
| `publish <type> <name>`                         | Push branch to remote                |
| `delete <type> <name>`                          | Delete branch                        |
| `release start --bump <major\|minor\|patch>`    | Create release branch                |
| `hotfix finish --tag <version> --message <msg>` | Complete hotfix                      |
| `sync --dry-run`                                | Sync main/master with develop        |
| `clone <url> [dir]`                             | Clone and initialize git-flow        |

## Workflow & Conventions

- Feature branches use conventional commit format: `feat(component): description`, `fix(component): description`, `chore:`, `refactor:`, `docs:`
- Releases tagged with `v` prefix in git and changelog
- Merge tags from release branches into develop
- `.env` comments start with `#`
- Website build outputs to `../public` for GitHub Pages

---

## Code Organization

### Code Quality Tools (oxlint/oxfmt)

The project uses [oxlint](https://oxc.rs/) for linting and [oxfmt](https://oxc.rs/) for formatting JavaScript/TypeScript code. These are run via `bunx` and configured through command-line flags:

- **oxlint --fix-dangerously** — Lint and auto-fix JS/TS files
- **oxfmt --write** — Format JS/TS files to standard style
- VCS integration: Git enabled via pre-commit hook

Configuration via `.oxfmtrc.json` (oxfmt) and `oxlint.json` (oxlint) at project root.

### Shell Script Functions

The `runcmd.sh` is organized into functional sections (see line comments for boundaries):

> **Line ranges are approximate.** The source file evolves; search function names as the authoritative reference.

- Path resolution utilities (≈lines 212-535): `resolve_path`, `resolve_default_script`, `resolve_default_in_dir`, `resolve_script_path`, `run_shfmt`
- Script discovery (≈lines 280-480): `resolve_default_script`, `resolve_default_in_dir`, `resolve_script_path`
- Version management and update check (≈lines 303-380): `version_lt`, `check_for_updates`
- Tooling integration (≈lines 536-745): `run_shfmt`, `safe_format_file`, `format_shell_scripts`, `run_lint`, `run_oxfmt`, `run_json_sort`
- Safe file operations (≈lines 546-695): `safe_format_file` with atomic updates, `format_shell_scripts`
- Execution orchestration (≈lines 884-912): `execute_script`
- Environment loading (≈lines 1026-1111): `load_env_file`, `load_env_files`
- Main entry point (≈lines 1127-1155): `main` function

## Dependencies

- **Bun**: JavaScript runtime and package manager (auto-installed)
- **oxlint**: Fast JavaScript/TypeScript linter (via bunx)
- **oxfmt**: Fast JavaScript/TypeScript formatter (via bunx)
- **shfmt**: Shell script parser and formatter (via bunx)
- **json-sort-cli**: JSON file sorting utility (via bunx)
- **Python 3**: For path resolution and timing on Unix
- **curl**: For Bun installation (auto-installed if missing)

---

## Modification Guidelines

### Adding Features to runcmd.sh

- Follow functional section organization and comment boundaries
- Use the existing `log_info` and `log_error` functions for output
- New functions should have comprehensive headers describing purpose, args, returns, and side effects
- Use `command_exists` utility instead of `command -v` directly
- See `safe_format_file` as reference for safe file operations with atomic updates and rollback

### Adding Features to runcmd.bat

- Follow the labeled function sections
- Use `ECHO !var!` for delayed expansion (via `ENABLEDELAYEDEXPANSION`)
- Use `%TO_NUL%` and `%ECHO_TO_NUL%` for debug-aware output suppression
- Add debug mode levels properly in `parse_debug_mode_and_collect`

### Creating New Runners

1. Copy `runcmd.sh` to your desired name (e.g., `build.sh`)
2. Create corresponding `.mjs` file (e.g., `build.mjs`) with your script logic
3. The `.mjs` file will be auto-discovered and executed

### Code Quality Enforcement

- **oxlint** — JS/TS linting (replaces Biome for lint)
- **oxfmt** — JS/TS formatting (replaces Biome for format)
- **shellcheck** — shell script validation
- **shfmt** — shell script formatting
- Pre-commit hook at `.githooks/pre-commit` runs all checks automatically
- Run manually: `./runcmd.sh +check`

## Important Notes

- The `.mjs` file is the target script — this is where your application logic belongs
- The runner scripts are boilerplate and should work as-is, but can be enhanced
- The runners parse arguments to separate runner options from script arguments
- Bun is sourced immediately after installation for immediate availability
- Exit codes from the `.mjs` script are propagated back to the caller
- The website subdirectory lives at `website/` — an Astro documentation site built to `../public` for GitHub Pages
- Git-flow automation CLI lives at `scripts/git-flow.js`