#!/usr/bin/env bun
import {
  COLOR_BOLD,
  COLOR_RESET,
  checkout,
  currentBranch,
  detectMainBranch,
  ensureBranchExists,
  ensureGitFlowAvailable,
  ensureGitFlowInitialized,
  logError,
  logInfo,
  logSuccess,
  mergeBranch,
  pullBranch,
  pushBranch,
  runGit,
  stashPop,
  stashPush
} from '../git-flow.js'

/** Print `sync` usage text to stdout. */
export function printHelp() {
  console.log(`
${COLOR_BOLD}Git Flow Sync${COLOR_RESET}

Usage: bun scripts/git-flow.js sync [options]

Synchronize main/master and develop branches with remote.

Options:
  -h, --help                Show this help message
  --dry-run                 Print actions without executing
  --offline                 Skip remote operations

This command:
  1. Stashes any uncommitted changes
  2. Pulls latest changes for main/master
  3. Pulls latest changes for develop
  4. Merges main/master into develop
  5. Pushes both branches
  6. Restores original branch and stashed changes

Examples:
  bun scripts/git-flow.js sync
  bun scripts/git-flow.js sync --dry-run
  bun scripts/git-flow.js sync --offline
`)
}

/**
 * Pop the stash entry captured at push time, wherever it now sits in the
 * stash list. Resolving by commit sha instead of popping the top keeps a
 * stash created concurrently (or earlier) from being consumed, and skips
 * the pop when our entry is already gone.
 * @param {string|null} sha - Commit sha of the pushed stash; null pops the top
 */
function popCapturedStash(sha) {
  if (!sha) {
    stashPop()
    return
  }
  const list = runGit('stash list --format=%gd:%H', { allowFail: true }) || ''
  const entry = list.split('\n').find((line) => line.endsWith(`:${sha}`))
  if (entry) stashPop(entry.slice(0, entry.indexOf(':')))
}

/**
 * Sync main/master and develop with the remote: stash, pull, merge into
 * develop, push, restore.
 * @param {{ dryRun?: boolean, offline?: boolean, help?: boolean }} opts
 * @returns {Promise<void>}
 */
export async function handleSync(opts) {
  if (opts.help) {
    printHelp()
    return
  }

  const available = ensureGitFlowAvailable({ ...opts, autoInstall: false })
  if (!available) {
    logError('git-flow is required for sync')
    process.exit(1)
  }

  ensureGitFlowInitialized()

  const { dryRun, offline } = opts

  const base = detectMainBranch()
  const original = currentBranch()
  const stash = stashPush('git-flow-sync') || ''
  const stashed = Boolean(stash) && !stash.includes('No local changes')
  const stashSha = stashed
    ? runGit('rev-parse --verify stash@{0}', { allowFail: true })
    : null

  logInfo(`Using base branch: ${base}`)

  try {
    checkout(base, { dryRun })
    pullBranch(base, { dryRun, offline })
    pushBranch(base, { dryRun, offline })

    ensureBranchExists('develop')
    checkout('develop', { dryRun })
    pullBranch('develop', { dryRun, offline })
    mergeBranch(base, 'develop', { dryRun })
    pushBranch('develop', { dryRun, offline })
  } catch (error) {
    // A failed merge leaves the tree conflicted; abort it so the restore
    // below can check the original branch out on a clean tree.
    runGit('merge --abort', { allowFail: true })
    throw error
  } finally {
    if (original) {
      checkout(original, { dryRun })
    }
    if (stashed) {
      popCapturedStash(stashSha)
    }
  }

  logSuccess('Sync complete')
}
