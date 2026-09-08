#!/usr/bin/env bun
import { COLOR_BOLD, COLOR_RESET } from '../git-flow.js'

/**
 * Per-type configuration for the `hotfix` git-flow branch family.
 * Consumed by `handleBranchOperation` in `./branch-operation.js`.
 * @type {import('./branch-operation.js').BranchOperationConfig}
 */
export const hotfixConfig = {
  defaultBump: 'patch',
  defaultBase: 'main',
  prefix: 'hotfix/',
  typeLabel: 'hotfix',
  printHelp
}

export function printHelp() {
  console.log(`
${COLOR_BOLD}Git Flow Hotfix${COLOR_RESET}

Usage: bun scripts/git-flow.js hotfix <action> [options]

Manage hotfix branches with automatic version bumping.

Actions:
  start                     Start a new hotfix branch
  finish                    Finish and merge a hotfix branch

Start Options:
  --name <name>             Hotfix name (default: derived from --version or --bump)
  --bump <patch>            Auto bump from current version (default: patch)
  --version <x.y.z>         Explicit version
  --base <branch>           Base branch (default: main)
  --push                    Push new branch and commit
  --no-changelog            Skip changelog update

Finish Options:
  --name <name>             Hotfix name (default: derived from --tag)
  --tag <tag>               Tag name (required)
  --message <msg>           Tag message (required)
  --push                    Push branches and tags
  --keep-branch             Keep the hotfix branch

Common Options:
  -h, --help                Show this help message
  --dry-run                 Print actions without executing
  --offline                 Skip remote operations
  --yes                     Non-interactive mode

Examples:
  bun scripts/git-flow.js hotfix start --bump patch
  bun scripts/git-flow.js hotfix start --version 1.1.1
  bun scripts/git-flow.js hotfix finish --tag v1.1.1 --message "Hotfix 1.1.1" --push
`)
}
