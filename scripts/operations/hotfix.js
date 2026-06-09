#!/usr/bin/env bun
import {
  COLOR_BOLD,
  COLOR_RESET,
  ensureGitFlowAvailable,
  ensureGitFlowInitialized,
  logError
} from "../git-flow.js"
import {handleFinish, handleStart} from "../lib/release-utils.js"

export function printHelp() {
  console.log(`
${COLOR_BOLD}Git Flow Hotfix${COLOR_RESET}

Usage: bun scripts/git-flow.js hotfix <action> [options]

Manage hotfix branches with automatic version bumping.

Actions:
  start                     Start a new hotfix branch
  finish                    Finish and merge a hotfix branch

Start Options:
  --name <name>             Hotfix name (default: nextHotfix)
  --bump <patch>            Auto bump from current version (default: patch)
  --version <x.y.z>         Explicit version
  --base <branch>           Base branch (default: main)
  --push                    Push new branch and commit
  --no-changelog            Skip changelog update

Finish Options:
  --name <name>             Hotfix name (default: nextHotfix)
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

export async function handleHotfix(action, opts) {
  const available = ensureGitFlowAvailable({...opts, autoInstall: false})
  if (!available) {
    logError("git-flow is required for hotfix operations")
    process.exit(1)
  }

  ensureGitFlowInitialized()

  // Check for help flag before processing
  if (opts.help) {
    printHelp()
    return
  }

  if (action === "start") {
    await handleStart(
      {
        defaultBump: "patch",
        defaultBase: "main",
        prefix: "hotfix/",
        typeLabel: "hotfix"
      },
      opts
    )
  } else if (action === "finish") {
    await handleFinish(
      {prefix: "hotfix/", typeLabel: "hotfix"},
      opts
    )
  } else {
    logError(`Unknown hotfix action: ${action}`)
    printHelp()
    process.exit(1)
  }
}
