#!/usr/bin/env bun
import { requireTypeAndName, requireValidCommand } from '../lib/core.js'
import {
  COLOR_BOLD,
  COLOR_RESET,
  ensureBranchExists,
  logInfo,
  logSuccess,
  logWarn,
  runGitFlow
} from '../git-flow.js'

/** Print `delete` usage text to stdout. */
export function printHelp() {
  console.log(`
${COLOR_BOLD}Git Flow Delete${COLOR_RESET}

Usage: bun scripts/git-flow.js delete <type> <name> [options]

Delete a branch locally.

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

/**
 * Delete a branch locally.
 * @param {{ type?: string, name?: string, force?: boolean, dryRun?: boolean, help?: boolean }} opts
 * @returns {Promise<void>}
 */
export async function handleDelete(opts) {
  if (!requireValidCommand(opts, { commandName: 'delete', helpFn: printHelp }))
    return

  const { force, dryRun } = opts

  const { type, name } = requireTypeAndName(opts)

  const branchName = `${type}/${name}`
  ensureBranchExists(branchName)

  logInfo(`Deleting ${type} branch: ${branchName}`)
  if (force) {
    logWarn('Force delete: branch may not be merged')
    runGitFlow(`${type} delete -f ${name}`, { dryRun })
  } else {
    runGitFlow(`${type} delete ${name}`, { dryRun })
  }

  logSuccess(`${type} branch deleted: ${branchName}`)
}
