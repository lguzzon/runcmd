#!/usr/bin/env bun
import {
  ensureBranchExists,
  ensureCleanTree,
  getBranchType,
  listBranchesByType,
  logError,
  logSuccess
} from './git-flow.js'
import { parseFlags, releaseFinalizeDefaults } from './lib/options.js'
import { promptTextSync } from './lib/prompts.js'
import { handleBranchOperation } from './operations/branch-operation.js'
import { hotfixConfig } from './operations/hotfix.js'
import { releaseConfig } from './operations/release.js'

export function printHelp() {
  console.log(`
${'\x1b[1m'}Git Flow Release/Hotfix Finalizer${'\x1b[0m'}

Usage: bun scripts/release-finalize.js [options]

Options:
  --type <release|hotfix>   Branch type (auto-detect if omitted)
  --branch <name>           Branch to finalize (release/* or hotfix/*)
  --push                    Push branches/tags
  --dry-run                 Print planned actions only
  --no-changelog            Skip changelog update
  --keep-branch             Do not delete release/hotfix branch
  --json                    Emit JSON summary to stdout
  --offline                 Skip pulls/fetches
  --yes                     Non-interactive
  -h, --help                Show help

Examples:
  bun scripts/release-finalize.js --type release --branch release/v1.2.0
  bun scripts/release-finalize.js --push --yes
`)
}

/**
 * Parse command-line arguments into an options object.
 * Honors process.env.CI === 'true' to set opts.yes.
 * @param {string[]} [argv] - Defaults to process.argv.slice(2)
 * @returns {object} Merged options
 */
export const parseArgs = (argv) =>
  parseFlags(argv ?? process.argv.slice(2), releaseFinalizeDefaults)

/**
 * Resolve the target release/hotfix branch to finalize.
 * Explicit --branch short-circuits. Otherwise picks from candidates
 * via listBranchesByType; single candidate returns directly, multiple
 * candidates prompt unless --yes (or CI) is set.
 * @param {object} opts - Parsed CLI options
 * @returns {string} The selected branch name
 */
export function detectBranch(opts) {
  if (opts.branch) return opts.branch

  const releases = listBranchesByType('release')
  const hotfixes = listBranchesByType('hotfix')

  const candidates = []
  if (!opts.type || opts.type === 'release') candidates.push(...releases)
  if (!opts.type || opts.type === 'hotfix') candidates.push(...hotfixes)

  if (candidates.length === 0) {
    logError('No release/hotfix branches found.')
    process.exit(1)
  }

  if (candidates.length === 1) return candidates[0]

  if (opts.yes || process.env.CI === 'true') {
    logError('Multiple branches found; specify --branch.')
    process.exit(1)
  }

  console.log('\nSelect branch to finalize:')
  candidates.forEach((b, idx) => {
    console.log(`  ${idx + 1}. ${b}`)
  })
  const answer = promptTextSync('Enter choice: ')
  const index = Number(answer) - 1
  if (Number.isNaN(index) || index < 0 || index >= candidates.length) {
    logError('Invalid selection')
    process.exit(1)
  }
  return candidates[index]
}

/**
 * Validate that a branch matches the requested type (if any) and is a
 * release/hotfix branch.
 * @param {string} branch - Branch name
 * @param {string|undefined} requested - Requested type from --type
 * @returns {string} Detected branch type
 */
export function ensureBranchMatchesType(branch, requested) {
  const detected = getBranchType(branch)
  if (requested && requested !== detected) {
    logError(`Branch '${branch}' does not match type '${requested}'.`)
    process.exit(1)
  }
  if (detected === 'unknown') {
    logError('Branch must be release/* or hotfix/*')
    process.exit(1)
  }
  return detected
}

/**
 * Render a JSON summary line for --json mode.
 * @param {string} status - ok | error
 * @param {string} branch - Branch name (may be empty on error)
 * @param {string} version - Version (may be empty on error)
 * @param {object[]} ops - Operations log entries
 * @returns {string} JSON string
 */
export function generateJsonSummary(status, branch, version, ops) {
  return JSON.stringify({ status, branch, version, operations: ops })
}

/**
 * Extract the vX.Y.Z version suffix from a branch name like release/v1.2.0.
 * @param {string} branch - Branch name
 * @returns {string|null} Version (no v prefix) or null if not found
 */
export function extractVersion(branch) {
  const m = branch.match(/v(\d+\.\d+\.\d+)$/)
  return m ? m[1] : null
}

export async function main() {
  const opts = parseArgs()
  const operations = []

  try {
    if (opts.help) {
      printHelp()
      process.exit(0)
    }

    ensureCleanTree()
    ensureBranchExists('main')
    ensureBranchExists('develop')

    const targetBranch = detectBranch(opts)
    const detectedType = ensureBranchMatchesType(targetBranch, opts.type)

    // Extract version from branch name for tag and message
    const version = extractVersion(targetBranch)
    if (!version) {
      logError('Branch name must include version (e.g., release/v1.2.0)')
      process.exit(1)
    }

    // Set required options for git-flow operations
    opts.name = version
    opts.tag = `v${version}`
    opts.message = `Release version ${version}`

    // Map to git-flow.js operation
    const action = 'finish'

    if (detectedType === 'hotfix') {
      await handleBranchOperation(action, opts, hotfixConfig)
    } else {
      await handleBranchOperation(action, opts, releaseConfig)
    }

    logSuccess('Release/hotfix finalized.')
    operations.push({ type: 'success', message: 'Release/hotfix finalized.' })
    console.log(`\n${'\x1b[1m'}Version:${'\x1b[0m'} ${version}`)
    console.log(`${'\x1b[1m'}Branch:${'\x1b[0m'} ${targetBranch}`)

    if (opts.json) {
      console.log(generateJsonSummary('ok', targetBranch, version, operations))
    }

    // Close stdin to prevent hanging
    process.stdin.pause()
  } catch (error) {
    if (!error || error.name !== 'GuardError') {
      logError(`Unexpected error: ${error.message}`)
    }
    operations.push({
      type: 'error',
      message: `Unexpected error: ${error.message}`
    })
    if (opts.json) {
      console.log(generateJsonSummary('error', '', '', operations))
    }
    process.exit(1)
  }
}

// Only run when invoked as a script (not when imported for testing).
if (import.meta.main) {
  main()
}
