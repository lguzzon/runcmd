#!/usr/bin/env bun
import { requireValidCommand } from '../lib/core.js'
import {
  COLOR_BOLD,
  COLOR_RESET,
  ensureBranchExists,
  logError,
  logInfo,
  logSuccess,
  logWarn,
  runGitFlow
} from '../git-flow.js'

export function printHelp() {
  console.log(`
${COLOR_BOLD}Git Flow Delete${COLOR_RESET}

Usage: bun scripts/git-flow.js delete <type> <name> [options]

Delete a branch locally and remotely.

Arguments:
  type                      Branch type: feature, release, hotfix, support
  name                      Branch name

Options:
  -f, --force               Force deletion (delete even if not merged)
  -h, --help                Show this help message
  --dry-run                 Print actions without executing

Examples:
  bun scripts/git-flow.js delete feature new-auth
  bun scripts/git-flow.js delete release v1.2.0 --force
`)
}

export async function handleDelete(opts) {
  if (!requireValidCommand(opts, { commandName: 'delete', helpFn: printHelp }))
    return

  const { type, name, force, dryRun } = opts

  if (!type || !name) {
    logError('Both <type> and <name> are required')
    process.exit(1)
  }

  const branchName = `${type}/${name}`
  ensureBranchExists(branchName)

  logInfo(`Deleting ${type} branch: ${branchName}`)
  runGitFlow(`${type} delete ${name}`, { dryRun })

  if (force) {
    logWarn('Force delete: branch may not be merged')
  }

  logSuccess(`${type} branch deleted: ${branchName}`)
}
