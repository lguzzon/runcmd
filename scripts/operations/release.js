#!/usr/bin/env bun
import {
  COLOR_BOLD,
  COLOR_RESET,
  ensureGitFlowAvailable,
  ensureGitFlowInitialized,
  logError
} from '../git-flow.js'
import { handleFinish, handleStart } from './release-utils.js'

export function printHelp() {
  console.log(`
${COLOR_BOLD}Git Flow Release${COLOR_RESET}

Usage: bun scripts/git-flow.js release <action> [options]

Manage release branches with automatic version bumping.

Actions:
  start                     Start a new release branch
  finish                    Finish and merge a release branch

Start Options:
  --name <name>             Release name (default: nextRelease)
  --bump <patch|minor|major> Auto bump from current version
  --version <x.y.z>         Explicit version
  --base <branch>           Base branch (default: develop)
  --push                    Push new branch and commit
  --no-changelog            Skip changelog update

Finish Options:
  --name <name>             Release name (default: nextRelease)
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

export async function handleBranchOperation(action, opts, config) {
  const {
    defaultBump,
    defaultBase,
    prefix,
    typeLabel,
    printHelp: helpFn
  } = config
  const available = ensureGitFlowAvailable({ ...opts, autoInstall: false })
  if (!available) {
    logError(`git-flow is required for ${typeLabel} operations`)
    process.exit(1)
  }

  ensureGitFlowInitialized()

  // Check for help flag before processing
  if (opts.help) {
    helpFn()
    return
  }

  if (action === 'start') {
    await handleStart({ defaultBump, defaultBase, prefix, typeLabel }, opts)
  } else if (action === 'finish') {
    await handleFinish({ prefix, typeLabel }, opts)
  } else {
    logError(`Unknown ${typeLabel} action: ${action}`)
    helpFn()
    process.exit(1)
  }
}

export async function handleRelease(action, opts) {
  await handleBranchOperation(action, opts, {
    defaultBump: 'minor',
    defaultBase: 'develop',
    prefix: 'release/',
    typeLabel: 'release',
    printHelp
  })
}
