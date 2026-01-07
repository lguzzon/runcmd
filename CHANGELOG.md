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
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-01-07

### Added
- Merge branch 'release/1.3.0' into develop
- feat(release): standardize version prefix handling in release and hotfix operations
- chore: bump version to 1.3.0 for release
- feat: prevent git-flow.js from executing when imported as module
- feat: modularize git-flow utilities and migrate commands to shared module
- feat: modularize git-flow commands and operations
- feat: migrate release scripts to use git-flow-utils module

### Changed
- Merge branch 'release/v1.2.0'
- chore: bump version to 1.2.0 for release
- feat(ci): add Bun caching to GitHub Pages workflow
- feat(website): migrate from React/Vite to Astro with Tailwind CSS

### Fixed
- Merge branch 'release/v1.1.0'
- fix(scripts): prevent stdin hanging in release scripts
- chore: bump version to 1.1.0 for release
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
- Initial commit

## [1.3.0] - 2026-01-07

### Added
- feat: modularize git-flow utilities and migrate commands to shared module
- feat: modularize git-flow commands and operations
- feat: migrate release scripts to use git-flow-utils module

### Changed
- Merge branch 'release/v1.2.0'
- chore: bump version to 1.2.0 for release
- feat(ci): add Bun caching to GitHub Pages workflow
- feat(website): migrate from React/Vite to Astro with Tailwind CSS

### Fixed
- Merge branch 'release/v1.1.0'
- fix(scripts): prevent stdin hanging in release scripts
- chore: bump version to 1.1.0 for release
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
- Initial commit

## [1.2.0] - 2026-01-07

### Added
- feat(ci): add Bun caching to GitHub Pages workflow
- feat(website): migrate from React/Vite to Astro with Tailwind CSS

### Changed
- Merge branch 'release/v1.1.0'
- fix(scripts): prevent stdin hanging in release scripts
- chore: bump version to 1.1.0 for release
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
- Initial commit

## [1.1.0] - 2026-01-07

### Added
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
- Initial commit

## [1.0.0] - 2025-12-01

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

[1.4.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.4.0
[1.3.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.3.0
[1.2.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.2.0
[1.1.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.1.0
[1.0.0]: https://github.com/lguzzon/runcmd/releases/tag/v1.0.0