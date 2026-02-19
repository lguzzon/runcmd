#!/usr/bin/env bun
import {
  COLOR_BOLD,
  COLOR_RESET,
  ensureGitFlowAvailable,
  ensureGitFlowInitialized,
  logError,
  logInfo,
  logSuccess,
  runGitFlow
} from "../git-flow.js"

export function printHelp() {
  console.log(`
${COLOR_BOLD}Git Flow Track${COLOR_RESET}

Usage: bun scripts/git-flow.js track <type> <name> [options]

Track a remote branch locally.

Arguments:
  type                      Branch type: feature, release, hotfix, support
  name                      Branch name

Options:
  -h, --help                Show this help message
  --dry-run                 Print actions without executing

Examples:
  bun scripts/git-flow.js track feature new-auth
  bun scripts/git-flow.js track release v1.2.0
`)
}

export async function handleTrack(opts) {
  const available = ensureGitFlowAvailable({...opts, autoInstall: false})
  if (!available) {
    logError("git-flow is required to track branches")
    process.exit(1)
  }

  ensureGitFlowInitialized()

  // Check for help flag before requiring arguments
  if (opts.help) {
    printHelp()
    return
  }

  const {type, name, dryRun} = opts

  if (!type || !name) {
    logError("Both <type> and <name> are required")
    process.exit(1)
  }

  const branchName = `${type}/${name}`

  logInfo(`Tracking ${type} branch: ${branchName}`)
  runGitFlow(`${type} track ${name}`, {dryRun})

  logSuccess(`${type} branch tracked: ${branchName}`)
}
