# scripts/lib

Utility library directory providing version management, changelog generation, CLI prompt functionality, git operations, validation guards, logging, git-flow installation, and shared option parsing for the release tooling.

## Contents

[changelog.js](./changelog.js) — Git-integrated CHANGELOG.md versioning: retrieves last tag, collects commits since ref, prepends version sections, commits changes.

[core.js](./core.js) — Shared command-dispatch helper: validates `opts.command` and prints help on missing/invalid command.

[git.js](./git.js) — Thin git wrapper: `runGit`, `runGitFlow`, `splitArgs`. All commands routed through these go through the same exec pipeline.

[installer.js](./installer.js) — `ensureGitFlowAvailable({ autoInstall, offline, dryRun })`: checks for `git-flow` on PATH, auto-installs via apt/brew when missing, honors offline/dry-run flags.

[logger.js](./logger.js) — ANSI-colored console output: `logInfo`, `logWarn`, `logError`, `logSuccess` plus `COLOR_*` constants.

[options.js](./options.js) — Shared CLI flag parser (`parseFlags`) and default option shapes (`releaseInitDefaults`, `releaseFinalizeDefaults`) for `release-init.js` and `release-finalize.js`. Unknown flags are ignored for backward compatibility; `CI=true` forces `opts.yes=true`.

[prompts.js](./prompts.js) — CLI prompting utilities: async/sync text input, yes/no prompts with CI bypass. Requires Bun runtime.

[validators.js](./validators.js) — Pre-flight guards: `ensureCleanTree`, `ensureBranchExists`, `ensureBranchMissing`, `detectMainBranch`, plus `checkout`/`pullBranch`/`pushBranch`/`mergeBranch`/`stashPush`/`stashPop`/`ensureTagMissing`/`getBranchType`/`getGitFlowConfig`. Throws `GuardError` on invariant violations.

[version.js](./version.js) — Semver utilities: validate, parse, increment (major/minor/patch), compare versions, read from version.txt.

## Dependencies

- `node:fs` — file system operations (readFileSync, writeFileSync, existsSync)
- `node:child_process` — git/command exec via `git.js`
- `./logger.js` — colored output used by `git.js` and `validators.js`
- `./version.js` — semver helpers consumed by `changelog.js`
- `../git-flow.js` — backward-compatible re-export hub that aggregates every public symbol from `./lib/*`

## Behavioral Contracts

**changelog.js:**

- Commit subject format: `- %s`
- Changelog section format: `## v${version} - ${date}`
- Version duplicate detection: `includes(\`## v${version}\`)`
- Default changelog commit: `docs: update changelog for v${version}`

**version.js:**

- Semver regex: `/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/` (no leading zeros)
- Compares as X.Y.Z returning 1/0/-1

**prompts.js:**

- Yes detection: `ans.toLowerCase().startsWith("y")`
- Prompt format: `[Y/n]` or `[y/N]` based on default
- Sync read buffer: 1024 bytes

**validators.js:**

- `ensureCleanTree()` aborts on any tracked-file modification
- `detectMainBranch()` probes `origin/HEAD` then falls back to `main`/`master`
- `checkout`/`pullBranch`/`pushBranch` honor `dryRun` to no-op without touching the working tree

## Stack

- **Runtime:** Bun (prompts.js shebang requires `#!/usr/bin/env bun`)
- **Module system:** ES modules
- **Entry points:** None (library exports only)
