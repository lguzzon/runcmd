# runcmd

Universal Bun-based script runner with auto-installation, cross-platform support, integrated development tooling, and git-flow management. Separates boilerplate from business logic via runner scripts handling Bun installation, path resolution, `.env` loading, and tooling integration.

## Stack

- **Runtime:** Bun (JavaScript/TypeScript executor)
- **Shell:** Bash (runcmd.sh), Batch (runcmd.bat)
- **Web Framework:** Astro 4.15.0 (website)
- **Styling:** Tailwind CSS (website)
- **CLI Tools:** oxlint (linting), oxfmt (formatting), shfmt (shell formatting), json-sort-cli

## Contents

### Runner Scripts

[runcmd.sh](./runcmd.sh) — Unix/macOS runner (1140 lines) with DEBUG flags (+debug/+dd/+ddd/+d0), environment loading, Bun auto-install, script resolution order, update checking, check mode (+check).

[runcmd.bat](./runcmd.bat) — Windows runner (610 lines) with equivalent functionality, PowerShell-based Bun installer, .env loading via `FOR /F` parsing, update mechanism.

[runcmd.mjs](./runcmd.mjs) — Default target script, logs CWD and CLI args, exits with code 10.

### Documentation

[README.md](./README.md) — Project overview, runner interface, git-flow commands table, configuration, development commands.

[CHANGELOG.md](./CHANGELOG.md) — Keep a Changelog format, Semantic Versioning v2.0.0, documented versions v1.11.1 through v1.0.0.

[LICENSE](./LICENSE) — MIT license for Luca Guzzon 2026.

[version.txt](./version.txt) — Declares version 1.11.1.

### Configuration

Configuration via oxlint.json and .oxfmtrc.json.

## Subdirectories

[scripts/](./scripts/) — Git Flow automation CLI with modular commands, lib utilities, and operations for branch management, release handling, and repository sync.

[website/](./website/) — Astro documentation site with Tailwind CSS, built to `../public` for GitHub Pages deployment.

## Architecture

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

## Patterns

- **Script Discovery:** Explicit path → current directory → runner directory fallback chain
- **Environment Override:** Current directory `.env` takes precedence over script directory
- **Debug Levels:** +d (basic), +dd (file ops), +ddd (full echo), +d0 (disabled)
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

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:7510c1e2 -->
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
<!-- END BEADS INTEGRATION -->

## NXTG-Forge

This project uses NXTG-Forge for AI-powered development governance.

- **Vision:** Universal Bun-based script runner with auto-install, cross-platform support, and integrated dev tooling
- **Goals:** Ship working MVP, High test coverage, Clean architecture
- **Commands:** Type /forge: to see available Forge commands
- **Governance:** Project state tracked in .claude/governance.json
