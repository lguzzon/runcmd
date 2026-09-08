# runcmd Specification

## 1. Project Overview

**Purpose:** Universal Bun-based script runner with auto-installation, cross-platform support, integrated development tooling, and git-flow management. Separates boilerplate from business logic via runner scripts handling Bun installation, path resolution, `.env` loading, and tooling integration.

**Core Value Proposition:** Provides a consistent, zero-config script execution environment across Unix/Windows platforms with automatic dependency management (Bun), environment variable loading, development tool integration (oxlint, oxfmt, shfmt), and git-flow automation.

**Problem Solved:** Eliminates platform-specific runner implementations, manual Bun installation, and repetitive boilerplate for script execution, while enabling standardized git-flow workflows.

**Technology Stack:**

- **Runtime:** Bun (JavaScript/TypeScript executor)
- **Shell:** Bash (runcmd.sh), Batch (runcmd.bat)
- **Web Framework:** Astro 4.15.0 (website)
- **Styling:** Tailwind CSS (website)
- **CLI Tools:** oxlint (linting), oxfmt (formatting), shfmt (shell formatting), json-sort-cli

---

## 2. Architecture

### System Design

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

### Module Boundaries

**Runner Module:** Handles platform-specific script execution, environment loading, path resolution, and update checking.

**Git-Flow Module:** Provides CLI command routing and execution for git-flow operations including branch lifecycle, release/hotfix management, and repository synchronization.

**Website Module:** Astro-based static documentation site with Tailwind styling, deployed to GitHub Pages.

### Data Flow Patterns

1. **Script Discovery Flow:** Explicit path (+r flag) → current directory .mjs → runner directory .mjs fallback chain
2. **Environment Override Flow:** Script directory `.env` loads first, current directory `.env` overwrites
3. **CLI Routing Flow:** `main()` → command routing → handlers → git operations → colored output

### Key Design Decisions

- **Script Discovery:** Explicit path takes precedence over discovery chain for predictability
- **Environment Override:** Current directory `.env` takes precedence to allow local overrides
- **Debug Levels:** +d (basic), +dd (file ops), +ddd (full echo), +d0 (disabled) for granular troubleshooting
- **Update Mechanism:** State file at `$HOME/.runcmd/state.json`, compares semantic versions with 7-day check interval

---

## 3. Public API Surface

### Runner Scripts

**runcmd.sh** (Unix/macOS runner, 1155 lines)

- Exported behaviors: DEBUG flags (+debug/+dd/+ddd/+d0), environment loading, Bun auto-install, script resolution, update checking, check mode (+check)

**runcmd.bat** (Windows runner, 610 lines)

- Exported behaviors: Equivalent Unix functionality, PowerShell-based Bun installer, .env loading via `FOR /F` parsing

**runcmd.mjs** (Default target script)

- Exported behavior: Logs CWD and CLI args, exits with code 10

### Git-Flow CLI Module (scripts/git-flow.js)

Backward-compatible re-export hub. Re-exports every public symbol from `./lib/*` and `parseArgs` from `./cli.js`. When invoked directly, hands off to `main()` in `./cli.js`.

```typescript
// Logger (scripts/lib/logger.js)
export const COLOR_INFO: string
export const COLOR_WARN: string
export const COLOR_ERROR: string
export const COLOR_RESET: string
export const COLOR_BOLD: string
export function logInfo(msg: string): void
export function logWarn(msg: string): void
export function logError(msg: string): void
export function logSuccess(msg: string): void

// Git wrapper (scripts/lib/git.js)
// runGit/runGitFlow accept a string (split via splitArgs) or a pre-split
// argv array; pipeStdout routes child stdout to the parent's stdout.
export function runGit(
  args: string | string[],
  opts?: { dryRun?: boolean; allowFail?: boolean; pipeStdout?: boolean }
): string
export function runGitFlow(
  args: string | string[],
  opts?: { dryRun?: boolean; allowFail?: boolean; pipeStdout?: boolean }
): string

// Validators (scripts/lib/validators.js)
export async function checkout(branch: string, opts?: { dryRun?: boolean }): Promise<void>
export function currentBranch(): string
export function detectMainBranch(): string
export async function ensureBranchExists(branch: string): Promise<void>
export async function ensureBranchMissing(branch: string): Promise<void>
export async function ensureCleanTree(): Promise<void>
export async function ensureGitFlowInitialized(): Promise<void>
export async function ensureTagMissing(tag: string): Promise<void>
export function getBranchType(branch: string): 'feature' | 'release' | 'hotfix' | 'support' | null
export function getGitFlowConfig(): Record<string, string>
export function listBranchesByType(type: string): string[]
export async function mergeBranch(branch: string, opts?: { dryRun?: boolean }): Promise<void>
export async function pullBranch(branch: string, opts?: { dryRun?: boolean }): Promise<void>
export async function pushBranch(branch: string, opts?: { dryRun?: boolean }): Promise<void>
export async function stashPop(): Promise<void>
export async function stashPush(msg: string): Promise<void>
export function validateBranchName(name: string): boolean

// Installer (scripts/lib/installer.js)
export function ensureGitFlowAvailable(opts: {
  autoInstall?: boolean
  offline?: boolean
  dryRun?: boolean
}): Promise<void>

// Re-exports from scripts/lib/changelog.js, prompts.js, version.js — see sections below.
// Re-exports from scripts/lib/options.js: parseFlags, releaseInitDefaults, releaseFinalizeDefaults.
// Re-export from scripts/cli.js: parseArgs.
```

### Release Operations (scripts/release-init.js)

Thin CLI entry for initiating a release/hotfix branch. Delegates to `handleBranchOperation` (via the type config in `operations/release.js` / `operations/hotfix.js`); parses flags with `parseFlags(argv, releaseInitDefaults)` from `lib/options.js`. Executes `main()` on module run; exports no public symbols.

```typescript
// CLI flags (parsed by lib/options.js parseFlags)
interface ReleaseInitOpts {
  help?: boolean
  type?: 'release' | 'hotfix'
  bump?: 'major' | 'minor' | 'patch'
  version?: string
  push?: boolean
  dryRun?: boolean
  yes?: boolean
  noChangelog?: boolean
  offline?: boolean
}

// Invoked on module run; delegates to branch-operation lifecycle.
function main(): Promise<void>
```

### Release Finalize (scripts/release-finalize.js)

Finalizes a release/hotfix branch: auto-detects branch type from `release/*` or `hotfix/*`, enforces clean tree + existence of main/develop, supports `--json` summary output.

```typescript
export function printHelp(): void
export const parseArgs: (argv?: string[]) => ReleaseFinalizeOpts
export function detectBranch(opts: ReleaseFinalizeOpts): string
export function ensureBranchMatchesType(branch: string, requested?: string): 'release' | 'hotfix'
export function generateJsonSummary(
  status: string, branch: string, version: string | null, ops: unknown[]
): string
export function extractVersion(branch: string): string | null
export async function main(): Promise<void>

interface ReleaseFinalizeOpts {
  help?: boolean
  type?: 'release' | 'hotfix'
  branch?: string
  push?: boolean
  dryRun?: boolean
  yes?: boolean
  noChangelog?: boolean
  keepBranch?: boolean
  json?: boolean
  offline?: boolean
}
```

### Version Library (scripts/lib/version.js)

```typescript
export const VERSION_FILE: string
export function parseVersion(
  version: string
): { major: number; minor: number; patch: number } | null
export function compareVersions(a: string, b: string): 1 | 0 | -1
export function validateVersion(version: string): boolean
export function incrementVersion(
  version: string,
  type: 'major' | 'minor' | 'patch'
): string
export function readVersion(): string
```

### Changelog Library (scripts/lib/changelog.js)

```typescript
export const CHANGELOG_FILE: string
export function getLastTag(): string | null
export function collectCommitsSince(ref: string | null): string[]
export function appendChangelog(
  version: string,
  opts: { dryRun?: boolean }
): boolean
export function commitChangelog(
  version: string,
  opts: { dryRun?: boolean }
): void
```

### Prompts Library (scripts/lib/prompts.js)

```typescript
export async function promptText(question: string): Promise<string>
export function promptTextSync(question: string): string
export async function promptYesNo(
  message: string,
  defaultYes?: boolean
): Promise<boolean>
```

### Commands Module (scripts/commands/\*.js)

Each command exports:

```typescript
export async function handleXxx(opts: XxxOpts): Promise<void>
export function printHelp(): void
```

Commands: config, delete, finish, init, list, publish, start, track

### Operations Module (scripts/operations/\*.js)

Operations have two handler shapes depending on the role:

- Lifecycle (release, hotfix): `handleStart(config, opts)`, `handleFinish(config, opts)` — config carries branch name/type, opts carries CLI flags.
- Shared lifecycle helper: `handleBranchOperation(action, opts, config)` — action string ('start' | 'finish') plus opts and config.
- Standalone: `handleClone(opts)`, `handleSync(opts)` — single-arg handler.

```typescript
// Standalone operation
export async function handleClone(opts: CloneOpts): Promise<void>
export async function handleSync(opts: SyncOpts): Promise<void>

// Release/hotfix lifecycle (scripts/operations/release-utils.js)
export async function handleStart(config: StartConfig, opts: StartOpts): Promise<void>
export async function handleFinish(config: FinishConfig, opts: FinishOpts): Promise<void>

// Shared branch lifecycle helper (scripts/operations/branch-operation.js)
export async function handleBranchOperation(
  action: 'start' | 'finish',
  opts: BranchOpts,
  config: BranchConfig
): Promise<void>
```

Operations: clone, hotfix, release, sync (all export `printHelp`).

---

## 4. Data Structures & State

### Configuration Objects

**Git-Flow Config (retrieved via `git flow config`)**

```typescript
interface GitFlowConfig {
  master: string // default: "main"
  develop: string // default: "develop"
  featurePrefix: string // default: "feature/"
  releasePrefix: string // default: "release/"
  hotfixPrefix: string // default: "hotfix/"
  supportPrefix: string // default: "support/"
  versionTagPrefix: string // default: "v"
}
```

**Update State (stored in `$HOME/.runcmd/state.json`)**

```typescript
interface RunCmdState {
  lastCheck: number // Unix timestamp
  currentVersion: string // Semantic version from version.txt
}
```

### Type Definitions

**Branch Types:**

- `feature/<name>` — Feature branches
- `release/<name>` — Release branches
- `hotfix/<name>` — Hotfix branches
- `support/<name>` — Support branches

**Command Options:**

```typescript
interface StartOpts {
  help?: boolean
  type: 'feature' | 'release' | 'hotfix' | 'support'
  name: string
  push?: boolean
  force?: boolean
  dryRun?: boolean
}

interface FinishOpts {
  help?: boolean
  type: 'feature' | 'release' | 'hotfix' | 'support'
  name: string
  push?: boolean
  squash?: boolean
  tag?: string
  dryRun?: boolean
}

interface DeleteOpts {
  help?: boolean
  type: 'feature' | 'release' | 'hotfix' | 'support'
  name: string
  force?: boolean
  dryRun?: boolean
}

interface PublishOpts {
  help?: boolean
  type: 'feature' | 'release' | 'hotfix' | 'support'
  name: string
  dryRun?: boolean
}
```

---

## 5. Configuration

### Runner Configuration

**Environment Variables:**

| Variable           | Description               | Required |
| ------------------ | ------------------------- | -------- |
| `RUNCMD_DEBUG`     | Enable debug output (1/0) | No       |
| `RUNCMD_NO_UPDATE` | Disable update checking   | No       |

**Update Check Configuration:**

- Update URL: `https://lguzzon.github.io/runcmd/version.txt`
- State file: `$HOME/.runcmd/state.json`
- Check interval: `7 * 24 * 3600` seconds (7 days)

**Bun Installation:**

- Install path: `$HOME/.bun`
- Install URL: `https://bun.sh/install`

**Tooling Configuration:**

- shfmt flags: `-bn -ci -i 2 -s`

### Git-Flow Configuration

**Branch Prefixes:**

- Feature: `feature/`
- Release: `release/`
- Hotfix: `hotfix/`
- Support: `support/`
- Version tag: `v`

### Website Configuration

**Astro Config (astro.config.mjs):**

- Output directory: `../public`
- Site URL: Configured for GitHub Pages

**Tailwind Config (tailwind.config.js):**

- Content: Scans `.astro` and `.css` files

---

## 6. Dependencies

### Root Level

None listed.

### Scripts Module

None (uses Bun runtime and git commands).

### Website Module

**package.json dependencies:**

- `astro`: ~4.15.0
- `@astrojs/tailwind`: ^5.1.0 (or latest compatible)
- `tailwindcss`: ^3.4.0
- `postcss`: ^8.4.0
- `autoprefixer`: ^10.4.0
- `typescript`: ~5.9.3
- `@types/node`: ^24.10.0
- `@astrojs/check`: ^0.9.0

Note: Linting and formatting are handled at the repo root via oxlint/oxfmt
(see `AGENTS.md`); the website module has no ESLint configuration.

---

## 7. Behavioral Contracts

### 7a. Runtime Behavior

**Error Handling:**

- Exit code 10: Default script execution completion
- Exit code 1: Git operations failure, validation errors
- Exit code 0: Help display, successful completion

**Retry Logic:**

- No automatic retry; commands fail fast on error

**Concurrency Model:**

- Sequential git operations
- Async/await for file I/O and CLI execution

**Resource Management:**

- Stash operations for preserving uncommitted changes
- Clean tree validation before destructive operations

### 7b. Implementation Contracts

**Regex Patterns:**

1. **.env file parsing:**

   ```regex
   ^[A-Za-z_][A-Za-z0-9_]*=
   ```

2. **Version format (semver, no leading zeros):**

   ```regex
   /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
   ```

3. **Version tag extraction:**

   ```regex
   v(\d+\.\d+\.\d+)$
   ```

4. **Branch name validation:**

   ```regex
   ^[\w-]+$
   ```

5. **Trailing slash normalization:**

   ```regex
   /\/$/
   ```

**Format Strings:**

1. **Changelog section:**

   ```text
   ## v${version} - ${date}
   ```

2. **Commit message:**

   ```text
   - %s
   ```

3. **Default changelog commit:**

   ```text
   docs: update changelog for v${version}
   ```

4. **Version bump commit:**

   ```text
   chore: bump version to ${version} for ${type}
   ```

**Sentinel Values:**

- **Debug flags:** +d, +dd, +ddd, +d0 (disabled when 0)
- **Branch types:** feature, release, hotfix, support
- **Bump types:** major, minor, patch

**Environment Variables:**

- `RUNCMD_DEBUG`: Enable debug output
- `RUNCMD_NO_UPDATE`: Disable update checking

**File Format Specifications:**

1. **.env files:**
   - Format: `KEY=value`
   - Comments: Lines starting with `#`
   - No quotes around values

2. **version.txt:**
   - Single line containing semantic version (e.g., "1.11.4")

3. **state.json:**

   ```json
   {
     "lastCheck": 1234567890,
     "currentVersion": "1.11.4"
   }
   ```

4. **CHANGELOG.md:**
   - Keep a Changelog format
   - Semantic Versioning v2.0.0
   - Tagged with `v` prefix in both git tags and changelog section headers (`## v${version} - ${date}`)

---

## 8. Test Contracts

### Runner Module Tests

**Script Resolution Tests:**

- Verify explicit +r flag path resolution
- Verify current directory .mjs fallback
- Verify script directory fallback
- Verify error when no script found

**Environment Loading Tests:**

- Verify script_dir .env loads first
- Verify current_dir .env overwrites
- Verify .env regex validation

**Debug Mode Tests:**

- Verify +d outputs basic debug info
- Verify +dd outputs file operations
- Verify +ddd outputs full echo
- Verify +d0 disables debug

### Git-Flow Module Tests

**Command Tests:**

- Verify help display for all commands
- Verify dry-run mode output
- Verify error handling for missing git-flow

**Branch Validation Tests:**

- Verify branch name regex validation
- Verify branch existence checks
- Verify clean tree validation

**Version Tests:**

- Verify semver parsing
- Verify version comparison (1/0/-1)
- Verify version increment (major/minor/patch)
- Verify leading zero rejection

### Website Module Tests

**Build Tests:**

- Verify static build to ../public
- Verify version.txt integration
- Verify base path handling

---

## 9. Build Plan

### Phase 1: Core Runner Scripts

**Defines:**

- `runcmd.sh` (Unix runner)
- `runcmd.bat` (Windows runner)
- `runcmd.mjs` (default target)
- `oxlint.json` (JS/TS lint config)
- `.oxfmtrc.json` (JS/TS format config)
- `version.txt`

**Consumes:** None

**Tasks:**

- Implement shell runners with environment loading
- Implement path resolution chain
- Implement update checking mechanism
- Implement debug flag handling

### Phase 2: Git-Flow Core Library

**Defines:**

- `scripts/git-flow.js` exports: logger (`logInfo`, `logWarn`, `logError`, `logSuccess`, `COLOR_INFO`, `COLOR_WARN`, `COLOR_ERROR`, `COLOR_RESET`, `COLOR_BOLD`), git wrapper (`runGit`, `runGitFlow`), validators (`checkout`, `currentBranch`, `detectMainBranch`, `ensureBranchExists`, `ensureBranchMissing`, `ensureCleanTree`, `ensureGitFlowInitialized`, `ensureTagMissing`, `getBranchType`, `getGitFlowConfig`, `listBranchesByType`, `mergeBranch`, `pullBranch`, `pushBranch`, `stashPop`, `stashPush`, `validateBranchName`), installer (`ensureGitFlowAvailable`), plus wildcard re-exports from `lib/changelog.js`, `lib/prompts.js`, `lib/version.js` and named re-exports from `lib/options.js` (`parseFlags`, `releaseInitDefaults`, `releaseFinalizeDefaults`) and `cli.js` (`parseArgs`).

**Consumes:** None

**Tasks:**

- Implement git operation wrappers
- Implement validation helpers
- Implement colored logging

### Phase 3: Git-Flow Utilities

**Defines:**

- `scripts/lib/version.js` exports: `VERSION_FILE`, `parseVersion`, `compareVersions`, `validateVersion`, `incrementVersion`, `readVersion`
- `scripts/lib/changelog.js` exports: `CHANGELOG_FILE`, `getLastTag`, `collectCommitsSince`, `appendChangelog`, `commitChangelog`
- `scripts/lib/prompts.js` exports: `promptText`, `promptTextSync`, `promptYesNo`

**Consumes:**

- `scripts/git-flow.js`: `logInfo`, `runGit`, `logError`

**Tasks:**

- Implement semver utilities
- Implement changelog generation
- Implement CLI prompts

### Phase 4: Git-Flow Commands

**Defines:**

- `scripts/commands/config.js`: `handleConfig`, `printHelp`
- `scripts/commands/delete.js`: `handleDelete`, `printHelp`
- `scripts/commands/finish.js`: `handleFinish`, `printHelp`
- `scripts/commands/init.js`: `handleInit`, `printHelp`
- `scripts/commands/list.js`: `handleList`, `printHelp`
- `scripts/commands/publish.js`: `handlePublish`, `printHelp`
- `scripts/commands/start.js`: `handleStart`, `printHelp`
- `scripts/commands/track.js`: `handleTrack`, `printHelp`

**Consumes:**

- `scripts/git-flow.js`: all exports

**Tasks:**

- Implement each command handler
- Implement validation chain per command

### Phase 5: Git-Flow Operations

**Defines:**

- `scripts/operations/clone.js`: `handleClone`, `printHelp`
- `scripts/operations/sync.js`: `handleSync`, `printHelp`
- `scripts/operations/branch-operation.js`: `handleBranchOperation` (shared start/finish helper)
- `scripts/operations/release-utils.js`: `updateVersionFile`, `commitChanges`, `promptVersion`, `normalizeBranchName`, `buildBranchName`, `buildFinishCommand`, `handleStart`, `handleFinish`
- `scripts/operations/release.js`: `releaseConfig`, `printHelp` (release-specific config)
- `scripts/operations/hotfix.js`: `hotfixConfig`, `printHelp` (hotfix-specific config)
- `scripts/release-init.js`: `main` (CLI entry; no public exports)
- `scripts/release-finalize.js`: `printHelp`, `parseArgs`, `detectBranch`, `ensureBranchMatchesType`, `generateJsonSummary`, `extractVersion`, `main`

**Consumes:**

- `scripts/git-flow.js`: all exports
- `scripts/lib/version.js`: all exports
- `scripts/lib/changelog.js`: all exports
- `scripts/lib/prompts.js`: all exports

**Tasks:**

- Implement composite operation workflows
- Implement release/hotfix versioning

### Phase 6: Website

**Defines:**

- `website/src/pages/index.astro`
- `website/src/pages/docs.astro`
- `website/src/layouts/BaseLayout.astro`
- `website/src/components/Nav.astro`
- `website/src/styles/global.css`
- `website/package.json`
- `website/astro.config.mjs`
- `website/tailwind.config.js`
- `website/tsconfig.json`

**Consumes:** None

**Tasks:**

- Create Astro project structure
- Implement layout and components
- Configure Tailwind CSS
- Set up build pipeline to ../public

### Phase 7: Documentation

**Defines:**

- README.md (root)
- CHANGELOG.md
- LICENSE
- scripts/README.md
- website/README.md

**Consumes:** None

**Tasks:**

- Write project documentation
- Maintain changelog format

---

## 10. Prompt Templates & System Instructions

No annex files provided with verbatim prompt templates. This section is omitted.

---

## 11. IDE Integration & Installer

No annex files provided with verbatim IDE/installer templates. This section is omitted.

---

## 12. File Manifest

### Root Directory

| File           | Module        | Exports                                                                      |
| -------------- | ------------- | ---------------------------------------------------------------------------- |
| `runcmd.sh`    | Runner        | Shell script with DEBUG flags, environment loading, Bun auto-install         |
| `runcmd.bat`   | Runner        | Windows batch script with equivalent functionality                           |
| `runcmd.mjs`   | Runner        | Default target script, logs CWD and CLI args                                 |
| `oxlint.json`  | Configuration | JS/TS lint config (oxlint)                                                   |
| `.oxfmtrc.json`| Configuration | JS/TS format config (oxfmt)                                                  |
| `version.txt`  | Configuration | Version file (1.11.4)                                                        |
| `README.md`    | Documentation | Project overview and usage                                                   |
| `CHANGELOG.md` | Documentation | Keep a Changelog format                                                      |
| `LICENSE`      | Documentation | MIT license                                                                  |

### scripts/ Directory

| File                  | Module        | Exports                                                                                                                                                                                                                                                                |
| --------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git-flow.js`         | Core          | Re-export hub: logger, git, validators, installer, lib/* (changelog/prompts/version), options (`parseFlags`, `releaseInitDefaults`, `releaseFinalizeDefaults`), `parseArgs` |
| `release-init.js`     | Release       | `main` (CLI entry; delegates to branch-operation lifecycle)                                                                                                                             |
| `release-finalize.js` | Release       | `printHelp`, `parseArgs`, `detectBranch`, `ensureBranchMatchesType`, `generateJsonSummary`, `extractVersion`, `main`                                                                     |
| `README.md`           | Documentation | Command interface table, library exports                                                                                                                                                                                                                               |

### scripts/commands/ Directory

| File         | Module   | Exports                      |
| ------------ | -------- | ---------------------------- |
| `config.js`  | Commands | `handleConfig`, `printHelp`  |
| `delete.js`  | Commands | `handleDelete`, `printHelp`  |
| `finish.js`  | Commands | `handleFinish`, `printHelp`  |
| `init.js`    | Commands | `handleInit`, `printHelp`    |
| `list.js`    | Commands | `handleList`, `printHelp`    |
| `publish.js` | Commands | `handlePublish`, `printHelp` |
| `start.js`   | Commands | `handleStart`, `printHelp`   |
| `track.js`   | Commands | `handleTrack`, `printHelp`   |

### scripts/lib/ Directory

| File           | Module    | Exports                                                                                                                    |
| -------------- | --------- | -------------------------------------------------------------------------------------------------------------------------- |
| `version.js`   | Utilities | `VERSION_FILE`, `parseVersion`, `compareVersions`, `validateVersion`, `incrementVersion`, `readVersion` |
| `changelog.js` | Utilities | `CHANGELOG_FILE`, `getLastTag`, `collectCommitsSince`, `appendChangelog`, `commitChangelog`           |
| `prompts.js`   | Utilities | `promptText`, `promptTextSync`, `promptYesNo`                                                           |
| `core.js`      | Utilities | `requireValidCommand` (shared command-dispatch gate)                                                   |
| `git.js`       | Utilities | `splitArgs`, `runGit`, `runGitFlow`                                                                    |
| `logger.js`    | Utilities | `COLOR_INFO`, `COLOR_WARN`, `COLOR_ERROR`, `COLOR_RESET`, `COLOR_BOLD`, `logInfo`, `logWarn`, `logError`, `logSuccess` |
| `installer.js` | Utilities | `ensureGitFlowAvailable`                                                                                |
| `options.js`   | Utilities | `parseFlags`, `releaseInitDefaults`, `releaseFinalizeDefaults`                                          |

### scripts/operations/ Directory

| File         | Module     | Exports                      |
| ------------ | ---------- | ---------------------------- |
| `clone.js`   | Operations | `handleClone`, `printHelp`                                 |
| `sync.js`    | Operations | `handleSync`, `printHelp`                                  |
| `branch-operation.js` | Operations | `handleBranchOperation` (shared start/finish helper) |
| `release-utils.js` | Operations | `updateVersionFile`, `commitChanges`, `promptVersion`, `normalizeBranchName`, `buildBranchName`, `buildFinishCommand`, `handleStart`, `handleFinish` |
| `release.js` | Operations | `releaseConfig`, `printHelp` (release-specific config)     |
| `hotfix.js`  | Operations | `hotfixConfig`, `printHelp` (hotfix-specific config)       |

### website/ Directory

| File                 | Module        | Exports                    |
| -------------------- | ------------- | -------------------------- |
| `package.json`       | Configuration | Dependencies and scripts   |
| `astro.config.mjs`   | Configuration | Astro config with Tailwind |
| `tailwind.config.js` | Configuration | Tailwind content config    |
| `tsconfig.json`      | Configuration | TypeScript config          |
| `README.md`          | Documentation | Setup and deployment       |

### website/src/ Directory

| File                       | Module     | Exports              |
| -------------------------- | ---------- | -------------------- |
| `pages/index.astro`        | Pages      | Homepage             |
| `pages/docs.astro`         | Pages      | Documentation page   |
| `layouts/BaseLayout.astro` | Layouts    | Root layout          |
| `components/Nav.astro`     | Components | Navigation component |
| `styles/global.css`        | Styles     | Global stylesheet    |
