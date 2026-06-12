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
- polish: remove dead code (_config, _flag, withDryRunLabel, skipped_count, dead SHIFT)
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

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## v1.9.2 - 2026-04-08

- feat(version): read version from version.txt for single source of truth

## v1.9.1 - 2026-02-19

- chore: bump version to 1.9.1
- chore: integrate agents-reverse-engineer and reformat config files
- style(scripts): reformat JS files to 2-space indent and no semicolons

## v1.9.0 - 2026-01-07

- chore(operations): remove commented-out changelog generation code
- Merge tag 'v1.8.0' into develop

## v1.8.0 - 2026-01-07

- Merge tag 'v1.7.0' into develop

## v1.7.0 - 2026-01-07

- fix(runcmd.sh): fix timer function variable assignment and arithmetic
- fix(runcmd.sh): fix shell variable assignment syntax
- refactor(website): reorganize package.json scripts and tsconfig.json structure
- Merge tag 'v1.6.0' into develop

## v1.6.0 - 2026-01-07

- feat(ui): enhance theme toggle button with hover effects and improved accessibility
- Merge tag 'v1.5.0' into develop

## v1.5.0 - 2026-01-07

- docs: update .gitignore path format for public directory
- feat(website): implement comprehensive UI redesign with component architecture
- docs: remove generated static files from repository
- docs: update project documentation and add comprehensive scripts guide
- Merge tag 'v1.4.0' into develop

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

## [Unreleased]

### Planned Features

- Enhanced Windows PowerShell support
- Additional development tool integrations
- Performance optimizations for large codebases
- Advanced configuration options
- Plugin system for custom tooling

[v1.9.2]: https://github.com/lguzzon/runcmd/releases/tag/v1.9.2
[v1.9.1]: https://github.com/lguzzon/runcmd/releases/tag/v1.9.1
[v1.9.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.9.0
[v1.8.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.8.0
[v1.7.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.7.0
[v1.6.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.6.0
[v1.5.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.5.0
[v1.4.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.4.0
[v1.3.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.3.0
[v1.2.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.2.0
[v1.1.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.1.0
[v1.0.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.0.0
[v1.10.4]: https://github.com/lguzzon/runcmd/releases/tag/v1.10.4
[v1.10.3]: https://github.com/lguzzon/runcmd/releases/tag/v1.10.3
[v1.10.2]: https://github.com/lguzzon/runcmd/releases/tag/v1.10.2
[v1.10.1]: https://github.com/lguzzon/runcmd/releases/tag/v1.10.1
[v1.10.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.10.0
