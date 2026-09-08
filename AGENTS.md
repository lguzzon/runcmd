# runcmd

Universal Bun-based script runner with auto-installation, cross-platform support, integrated development tooling, and git-flow management. Separates boilerplate from business logic via runner scripts handling Bun installation, path resolution, `.env` loading, and tooling integration.

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

<!-- Operating procedures (issue tracking, session completion, governance) live in CLAUDE.md — the single authoritative home for them. Do not duplicate them here. -->
