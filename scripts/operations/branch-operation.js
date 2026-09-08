#!/usr/bin/env bun
import {
  ensureGitFlowAvailable,
  ensureGitFlowInitialized,
  logError
} from '../git-flow.js'
import { handleFinish, handleStart } from './release-utils.js'

/**
 * Per-type configuration consumed by `handleBranchOperation`. Each git-flow
 * branch family (release, hotfix, future support) supplies its own values
 * so the shared handler stays type-agnostic.
 *
 * @typedef {Object} BranchOperationConfig
 * @property {'patch'|'minor'|'major'} defaultBump default version bump when caller omits --bump
 * @property {string} defaultBase base branch to fork from (e.g. `develop`, `main`)
 * @property {string} prefix branch prefix including trailing slash (e.g. `release/`)
 * @property {string} typeLabel git-flow command name and log label (e.g. `release`)
 * @property {() => void} printHelp help printer for this branch family
 */

/**
 * Dispatch a `start` or `finish` action for a release-family git-flow
 * branch. Validates git-flow availability and initialization, then routes
 * to `handleStart` / `handleFinish` with the supplied per-type config.
 *
 * @param {string} action `start` or `finish`
 * @param {object} opts CLI options (help, dry-run, name, version, etc.)
 * @param {BranchOperationConfig} config per-type configuration
 * @returns {Promise<void>}
 */
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
