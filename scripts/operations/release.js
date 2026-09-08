#!/usr/bin/env bun
import { COLOR_BOLD, COLOR_RESET } from '../lib/logger.js'

/**
 * Per-type configuration for the `release` git-flow branch family.
 * Consumed by `handleBranchOperation` in `./branch-operation.js`.
 * @type {import('./branch-operation.js').BranchOperationConfig}
 */
export const releaseConfig = {
  defaultBump: 'minor',
  defaultBase: 'develop',
  prefix: 'release/',
  typeLabel: 'release',
  printHelp
}

export function printHelp() {
  console.log(`
${COLOR_BOLD}Git Flow Release${COLOR_RESET}

Usage: bun scripts/git-flow.js release <action> [options]

Manage release branches with automatic version bumping.

Actions:
  start                     Start a new release branch
  finish                    Finish and merge a release branch

Start Options:
  --name <name>             Release name (default: derived from --version or --bump)
  --bump <patch|minor|major> Auto bump from current version
  --version <x.y.z>         Explicit version
  --base <branch>           Base branch (default: develop)
  --push                    Push new branch and commit
  --no-changelog            Skip changelog update

Finish Options:
  --name <name>             Release name (default: derived from --tag)
  --tag <tag>               Tag name (required)
  --message <msg>           Tag message (required)
  --push                    Push branches and tags
  --keep-branch             Keep the release branch

Common Options:
  -h, --help                Show this help message
  --dry-run                 Print actions without executing
  --offline                 Skip remote operations
  --yes                     Non-interactive mode

Examples:
  bun scripts/git-flow.js release start --bump minor
  bun scripts/git-flow.js release start --version 1.2.0
  bun scripts/git-flow.js release finish --tag v1.2.0 --message "Release 1.2.0" --push
`)
}
