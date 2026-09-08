# scripts

Git Flow automation CLI and library for branch management, release/hotfix handling, and repository synchronization. Provides modular command routing, branch lifecycle operations, version bumping, and changelog generation.

## Contents

[git-flow.js](./git-flow.js) — Backward-compatible re-export hub. Aggregates every public symbol from `./lib/*` (logger, git, validators, installer, changelog, prompts, version, options) and re-exports `parseArgs`/`main` from `./cli.js`. Thin entry shim: when run directly, hands off to `main()` in `cli.js`. Exists for backward compatibility — internal callers may import directly from `./lib/*` for narrower fan-in.

[cli.js](./cli.js) — CLI dispatcher: argument parsing (`parseArgs`), command registry (`COMMANDS`, `BRANCH_OPERATIONS`), top-level `printHelp()`, `handleInstall()`, and `main()`. Imports from `./commands/*` and `./operations/*` handlers plus `./lib/logger.js`, `./lib/git.js`, `./lib/installer.js`. The actual entry point when `bun scripts/git-flow.js <cmd>` is invoked.

[release-init.js](./release-init.js) — CLI for initiating release/hotfix branches, delegates to `./operations/release.js` and `./operations/hotfix.js`. Parses `--type`, `--bump`, `--version`, `--push`, `--dry-run`, `--yes`, `--no-changelog`, `--offline` flags.

[release-finalize.js](./release-finalize.js) — CLI for finalizing release/hotfix branches, auto-detects branch type from `release/*` or `hotfix/*` globs, enforces clean tree and existence of main/develop. Parses `--type`, `--branch`, `--push`, `--dry-run`, `--yes`, `--no-changelog`, `--keep-branch`, `--json`, `--offline` flags.

[README.md](./README.md) — Documentation with command interface table, library exports, design patterns, environment variables, and contributing rules.

## Subdirectories

[commands/](./commands/) — CLI command handlers for git-flow operations: init, start, finish, publish, track, delete, list, config.

[lib/](./lib/) — Shared utilities: version.js (semver), changelog.js, prompts.js (CLI interaction), options.js (shared flag parser + option defaults).

[operations/](./operations/) — High-level workflows: clone, sync, release, hotfix, release-utils.js (release/hotfix lifecycle).

## Architecture

```text
main() → command routing (help/install/init/start/finish/publish/track/delete/list/config/sync/clone/release/hotfix)
         ↓
   [commands/*.js] or [operations/*.js] handlers
         ↓
   [lib/*.js] utilities + lib/git.js wrappers
```

CLI dispatch lives in `cli.js` (parser + registry + `main`). `git-flow.js` re-exports from `lib/*` and `cli.js` for backward compatibility — when invoked directly it delegates to `cli.js:main()`.

## Stack

- **Runtime:** Bun (prompts.js shebang requires `#!/usr/bin/env bun`)
- **Module system:** ES modules
- **CLI entry points:** `bun scripts/git-flow.js`, `bun scripts/release-init.js`, `bun scripts/release-finalize.js`

## Patterns

- **CLI routing:** switch statement in `main()` dispatching to `handleXxxCommand()` or `handleXxxOperation()` functions
- **Handler signature:** async function accepting `opts` object with `help?`, `dryRun?`, operation-specific flags
- **Branch naming:** `${type}/${name}` pattern for feature/release/hotfix/support branches
- **Validation chain:** `ensureGitFlowAvailable()` → `ensureGitFlowInitialized()` → branch existence/tree state checks → operation execution
- **Exit codes:** 0 for success, 1 for errors

## Behavioral Contracts

Version regex from `release-finalize.js`: `v(\d+\.\d+\.\d+)$` extracts version from branch name (e.g., `release/v1.2.0` → `v1.2.0` tag).

Semver regex from `lib/version.js`: `/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/` enforces no leading zeros.

Branch validation regex from `git-flow.js`: `^[\w-]+$` for feature/release/hotfix/support branch names.

## Import Map

| Module                          | Exports                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `./git-flow.js`                 | `checkout`, `COLOR_ERROR`, `COLOR_INFO`, `currentBranch`, `detectMainBranch`, `ensureBranchExists`, `ensureBranchMissing`, `ensureCleanTree`, `ensureGitFlowAvailable`, `ensureGitFlowInitialized`, `ensureTagMissing`, `getBranchType`, `getGitFlowConfig`, `logError`, `logInfo`, `logSuccess`, `logWarn`, `mergeBranch`, `promptText`, `promptTextSync`, `promptYesNo`, `pullBranch`, `pushBranch`, `runGit`, `runGitFlow`, `stashPop`, `stashPush`, `validateBranchName`, `parseArgs` (re-exported from `./cli.js`) |
| `./cli.js`                      | `parseArgs`, `main` (CLI dispatch — argument parsing, command registry, help printer)                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `./lib/version.js`              | `parseVersion`, `compareVersions`, `validateVersion`, `incrementVersion`, `readVersion`                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `./lib/changelog.js`            | `getLastTag`, `collectCommitsSince`, `appendChangelog`, `commitChangelog`                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `./lib/prompts.js`              | `promptText`, `promptTextSync`, `promptYesNo`                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `./operations/release-utils.js` | `updateVersionFile`, `commitChanges`, `promptVersion`, `normalizeBranchName`, `buildBranchName`, `buildFinishCommand`, `handleStart`, `handleFinish`                                                                                                                                                                                                                                                                                                                                                                   |
| `./lib/options.js`              | `parseFlags`, `releaseInitDefaults`, `releaseFinalizeDefaults`                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
