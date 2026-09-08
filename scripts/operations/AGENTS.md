# scripts/operations

Implements Git Flow operational commands for branch lifecycle management: cloning repos with git-flow initialization, managing hotfix and release branches with version bumping/changelog generation, and syncing base branches with remote.

## Contents

[clone.js](./clone.js) — Clones a repository and initializes git-flow. Exports `printHelp()` and `handleClone(opts)` with dry-run support.

[hotfix.js](./hotfix.js) — Per-type configuration for the hotfix branch family. Exports `hotfixConfig` (`{ defaultBump, defaultBase, prefix, typeLabel, printHelp }`) and `printHelp()`. Lifecycle dispatch lives in `branch-operation.js`.

[release.js](./release.js) — Per-type configuration for the release branch family. Exports `releaseConfig` (`{ defaultBump, defaultBase, prefix, typeLabel, printHelp }`) and `printHelp()`. Lifecycle dispatch lives in `branch-operation.js`.

[sync.js](./sync.js) — Syncs local main/master and develop branches with remote. Exports `printHelp()` and `handleSync(opts)`.

## Patterns

All operation scripts follow identical conventions:

- Export `printHelp()` for CLI usage documentation
- Export either a handler function (`clone`, `sync`) accepting an opts object, or a per-type config consumed by the shared dispatcher `handleBranchOperation(action, opts, config)` in `branch-operation.js` (`release`, `hotfix`)
- Support `--help`, `--dry-run`, `--offline`, `--yes` flags
- Import utilities from `../git-flow.js` and `../lib/*`

## Behavioral Contracts

All scripts enforce:

- **Version file**: `version.txt` in project root
- **Changelog file**: `CHANGELOG.md` in project root
- **Semver validation**: `x.y.z` format via `validateVersion()`
- **Branch naming**: `hotfix/v${version}`, `release/v${version}`
- **Commit messages**: `chore: bump version to ${version} for ${type}`
- **Exit code 1** on validation failures

## Dependencies

| Module                | Symbols                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `../git-flow.js`      | `runGit`, `runGitFlow`, `ensureGitFlowAvailable`, `ensureCleanTree`, `logError`, `logInfo`, `logSuccess`, `stashPush`, `stashPop` |
| `../lib/version.js`   | `validateVersion`, `parseVersion`, `incrementVersion`, `compareVersions`, `readVersion`                                           |
| `../lib/changelog.js` | `appendChangelog`, `commitChangelog`                                                                                              |
| `../lib/prompts.js`   | `promptText`                                                                                                                      |

## Subdirectories

[../](./) — Git Flow core: git-flow.js, release-init.js, release-finalize.js

Shared utilities live in [../lib/](../lib/); see the Dependencies table above for the actual modules operations import from.
