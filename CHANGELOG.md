# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- feat: verify self-update payloads against `update.sha256` manifest (runcmd.sh + runcmd-update.js fail closed on checksum mismatch; publish.yml generates manifest at deploy)

### Fixed

- fix(runcmd.sh): `+help` now exits 0 (was 1); `+r` without a value and unknown `+...` options exit 1 instead of falling through to script execution
- fix(runcmd.sh): `.env` values containing spaces are exported intact (guard rejected any non-graph character); `\r` stripped for CRLF files
- fix(runcmd.sh): `.env` loaded once when the runner directory equals the current directory (duplicate exports + duplicate warnings)
- fix(runcmd.sh): `format_shell_scripts` counters used `((x++))`, which returns the pre-increment value and aborts under `set -e` when the count is 0
- fix(runcmd.sh): `version_lt` validates semver input; a malformed remote `version.txt` now logs and skips instead of reading as "up to date"
- fix(runcmd.sh): timer helpers spawn `bun` twice per debug run; now use `EPOCHREALTIME` (bash 5), GNU `date +%s%3N`, then bun as fallback
- fix(runcmd.bat): `+check` always exited 0; now propagates the failure status
- fix(runcmd.bat): argument forwarding was capped at 8 args; `--env`/`-e` used top-level `&` so the loop dropped every argument; special options (+help/+version/+check) were only detected in the first argument
- fix(git-flow): `--help` is honoured before git-flow availability checks (release, hotfix, sync)
- fix(options): `--type/--branch/--bump/--version` without a value now error instead of silently setting `undefined`
- fix: `parseArgs` keeps flags in the 2nd argv slot for branch commands — `start --name x` no longer swallows the flag as the subcommand
- fix(git-flow): `finish` passed `-p`, which git-flow-next 2.1.0 reads as `--preserve-merges`; the merge, tag, and branches were never pushed. Now uses `--push`
- fix(changelog): `appendChangelog` prepended the new section above the `# Changelog` header; it now inserts before the first released `## v...` heading

### Changed

- refactor: drop the dead `:arg_check` and `:collect_args` batch helpers
- refactor: split git-flow.js god module into lib/ + cli.js dispatcher
- test: suite for git-flow libs, wire bun test runner, guard repo files
- test: e2e pins for `+h` exit status, unknown-option rejection, `.env` spaces, single `.env` load
- chore: NXTG-Forge governance + beads issue tracker
- docs: sync version refs to 1.11.4

## v2.0.0 - 2026-10-19
- chore: ignore the .empryo directory
- docs: sync AGENTS.md and the Windows install steps to reality
- ci: cover the untested suites, the website and lint
- fix(publish): serve the updater and gate the deploy on CI
- fix(runcmd): validate the Bun installer and the Windows update payload
- Merge branch 'main' into develop
- fix(changelog): insert release section below the file header
- fix(git-flow): use --push for finish; -p is --preserve-merges in git-flow-next
- Merge branch 'main' into develop

## v1.12.0 - 2026-10-19

- fix(runcmd): improve option parsing, .env handling, and shell robustness
- bd init: initialize beads issue tracking
- chore: record session governance bookkeeping
- docs: normalize website/src/styles AGENTS.md title
- docs: make AGENTS.md the canonical guidance file, CLAUDE.md a thin pointer
- docs: review and simplify CLAUDE.md, AGENTS.md, CLAUDE.local.md
- test: add end-to-end suite for the runcmd runner
- ci: add test and type-check workflow, update governance bookkeeping
- chore: record session governance bookkeeping
- feat(types): add strict tsconfig with checkJs, fix all tsc errors in source files
- docs: add JSDoc to 67 public exports; strip stale website claims
- docs: re-sync AGENTS.md + SPEC.md to actual module exports
- test: cover all previously-untested git-flow command modules
- chore: gap-analysis quick wins — layering, gitignore, changelog
- chore: session log sync
- chore: session log sync
- docs: sync version refs to 1.11.4
- feat: verify self-update payloads against update.sha256 manifest
- fix: parseArgs keeps flags in 2nd slot for branch commands; full git-flow refactor suite green
- test: add suite for git-flow libs, wire runner, guard repo files
- chore: add NXTG-Forge governance + test suite for git-flow libs
- refactor: split git-flow.js god module, fix SOLID violations

## v1.11.4 - 2026-09-08

- chore: merge beads hook into .githooks/pre-commit

## v1.11.3 - 2026-06-26

- docs: rewrite README with gold-standard patterns
- bd init: initialize beads issue tracking

## v1.11.2 - 2026-06-12

- docs: fix doc/code coherence audit findings across 10 files (line counts, dep claims, examples, AGENTS.md exports, CHANGELOG refs)

## v1.11.1 - 2026-06-12

- docs: update website for v1.11.0 (oxlint/oxfmt, Windows +check/+r, security messaging)
- docs: use version.txt as golden source for version info
- docs: sync AGENTS.md version claims to 1.11.0

## v1.11.0 - 2026-06-12

- refactor: deepRefactor-graphify pipeline — structural map, adversarial verification, security audit, implementation, review
- fix: version_lt equality bug causing perpetual update loop
- fix: .env eval injection (arbitrary code via VAR=$(id))
- fix: runGit command injection (array args instead of string interpolation)
- fix: ENDLOCAL exit code capture in runcmd.bat (delayed expansion)
- fix: --env SHIFT scope bug in runcmd.bat
- fix: auto-install SHA256 checksum verification, pinned release, no sudo
- fix: self-update integrity (bash -n validation, state write timing)
- fix: resolve_path bun -e injection
- feat: +check mode and +r flag for runcmd.bat
- feat: core.js with shared requireValidCommand helper
- refactor: release/hotfix consolidated into parameterized handler
- refactor: release-utils.js and options.js moved from lib/ to operations/
- refactor: release-init.js and release-finalize.js thin wrappers
- docs: migrate all Biome references to oxlint/oxfmt
- docs: fix line counts, function names, version claims across 5 doc files
- docs: accept ADR-1 error handling strategy (two-tier convention)
- polish: remove dead code (\_config, \_flag, withDryRunLabel, skipped_count, dead SHIFT)
- polish: extract shared run_shfmt dispatch helper
- polish: remove auto-generation headers from all CLAUDE.md/AGENTS.md files
- polish: remove tautological function headers and thinking-out-loud comments

## v1.10.4 - 2026-06-09

- chore: update bun lockfile after eslint removal

## v1.10.3 - 2026-06-09

- refactor: migrate Biome to oxlint/oxfmt, remove old tools
- feat: add oxlint, oxfmt, shellcheck linting and pre-commit hook

## v1.10.2 - 2026-06-09

- ci: bump actions to latest major versions

## v1.10.1 - 2026-06-09

- ci: opt Node.js 24 for GitHub Actions runner

## v1.10.0 - 2026-06-09

- fix: strip default 'nextRelease' name in versioned release/hotfix start
- refactor: consolidate, deduplicate, and fix 20 quality issues

## v1.9.2 - 2026-04-08

- feat(version): read version from version.txt for single source of truth

## v1.9.1 - 2026-02-19

- chore: bump version to 1.9.1
- chore: integrate agents-reverse-engineer and reformat config files
- style(scripts): reformat JS files to 2-space indent and no semicolons

## v1.9.0 - 2026-01-07

- chore(operations): remove commented-out changelog generation code

## v1.7.0 - 2026-01-07

- fix(runcmd.sh): fix timer function variable assignment and arithmetic
- fix(runcmd.sh): fix shell variable assignment syntax
- refactor(website): reorganize package.json scripts and tsconfig.json structure

## v1.6.0 - 2026-01-07

- feat(ui): enhance theme toggle button with hover effects and improved accessibility

## v1.5.0 - 2026-01-07

- docs: update .gitignore path format for public directory
- feat(website): implement comprehensive UI redesign with component architecture
- docs: remove generated static files from repository
- docs: update project documentation and add comprehensive scripts guide

## v1.4.0 - 2026-01-07

- feat(release): standardize version prefix handling in release and hotfix operations

## v1.3.0 - 2026-01-07

- fix: prevent git-flow.js from executing when imported as module
- feat: modularize git-flow utilities and migrate commands to shared module
- feat: modularize git-flow commands and operations
- feat: migrate release scripts to use git-flow-utils module

## v1.2.0 - 2026-01-07

- feat(ci): add Bun caching to GitHub Pages workflow
- feat(website): migrate from React/Vite to Astro with Tailwind CSS
- fix(scripts): prevent stdin hanging in release scripts

## v1.1.0 - 2026-01-07

- feat(scripts): update file permissions for release management scripts
- feat(scripts): add comprehensive git flow release and hotfix management tools
- feat(config): reorganize TypeScript configuration files with improved formatting and structure
- feat: update dependencies and improve path resolution robustness
- feat: reorganize package.json scripts and improve tsconfig.json formatting
- feat: add .gitignore file for project configuration
- feat: add version management and help system to runcmd
- feat: implement enterprise-grade landing page and CI/CD pipeline
- fix: add robust timeouts and offline checks to update mechanism
- feat: implement self-update mechanism and GitHub Pages publishing
- feat: initial implementation of cross-platform command runner

## v1.0.0 - 2025-12-01

### Added

- Initial release of runcmd universal script runner
- Cross-platform support for Unix/macOS and Windows
- Automatic Bun installation and environment management
- Integrated development tooling (Biome, shfmt, json-sort-cli)
- Git flow management tools and utilities
- Self-updating mechanism from GitHub Pages
- Comprehensive documentation and website

### Features

- **Core Runner Scripts**: `runcmd.sh` and `runcmd.bat` for cross-platform execution
- **Script Resolution**: Smart discovery of `.mjs` files based on runner names
- **Environment Management**: Automatic `.env` file loading
- **Debug Mode**: Millisecond-precision timing and detailed logging
- **Code Quality**: Integrated formatting and validation tools
- **Git Flow Integration**: Complete git-flow management system
- **Self-Healing**: Safe self-formatting and atomic file operations
- **Version Management**: Automatic updates and version tracking

### Documentation

- Comprehensive README with usage examples
- Website built with Astro and Tailwind CSS
- API documentation in individual script files
- Git flow command reference and help system

[Unreleased]: https://github.com/lguzzon/runcmd/compare/v1.11.4...HEAD
[v1.11.4]: https://github.com/lguzzon/runcmd/releases/tag/v1.11.4
[v1.11.3]: https://github.com/lguzzon/runcmd/releases/tag/v1.11.3
[v1.11.2]: https://github.com/lguzzon/runcmd/releases/tag/v1.11.2
[v1.11.1]: https://github.com/lguzzon/runcmd/releases/tag/v1.11.1
[v1.11.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.11.0
[v1.10.4]: https://github.com/lguzzon/runcmd/releases/tag/v1.10.4
[v1.10.3]: https://github.com/lguzzon/runcmd/releases/tag/v1.10.3
[v1.10.2]: https://github.com/lguzzon/runcmd/releases/tag/v1.10.2
[v1.10.1]: https://github.com/lguzzon/runcmd/releases/tag/v1.10.1
[v1.10.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.10.0
[v1.9.2]: https://github.com/lguzzon/runcmd/releases/tag/v1.9.2
[v1.9.1]: https://github.com/lguzzon/runcmd/releases/tag/v1.9.1
[v1.9.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.9.0
[v1.7.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.7.0
[v1.6.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.6.0
[v1.5.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.5.0
[v1.4.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.4.0
[v1.3.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.3.0
[v1.2.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.2.0
[v1.1.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.1.0
[v1.0.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.0.0
