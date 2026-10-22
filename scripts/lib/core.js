#!/usr/bin/env bun
import { ensureGitFlowAvailable } from './installer.js'
import { logError } from './logger.js'
import { ensureGitFlowInitialized } from './validators.js'

/**
 * Options shared by command handlers (spread into the availability probe).
 * @typedef {object} HandlerOpts
 * @property {boolean} [help] show help and stop
 * @property {boolean} [dryRun] do not perform side effects
 * @property {boolean} [offline] never reach the network
 * @property {string} [command] the subcommand being run (cli dispatcher)
 * @property {string} [sub] sub-argument for branch operations
 */

/**
 * Validate a command is runnable: git-flow available and initialized.
 * Prints help (returning false) when `opts.help` is set.
 * @param {HandlerOpts} opts - Handler options (spread into the availability probe)
 * @param {{ commandName: string, helpFn?: Function }} cfg
 * @returns {boolean} true when the command may proceed
 * @throws {GuardError} when git-flow is unavailable or uninitialized
 */
export function requireValidCommand(opts, { commandName, helpFn }) {
  const available = ensureGitFlowAvailable({ ...opts, autoInstall: false })
  if (!available) {
    logError(`${commandName}: git-flow not available`)
    process.exit(1)
  }

  ensureGitFlowInitialized()

  if (opts.help && helpFn) {
    helpFn()
    return false
  }

  return true
}

/**
 * Require the `<type> <name>` positional pair shared by the branch
 * commands (start/finish/publish/track/delete). Exits with status 1
 * when either part is missing.
 * @param {{ type?: string, name?: string }} opts
 * @returns {{ type: string, name: string }} The validated pair
 */
export function requireTypeAndName(opts) {
  if (!opts.type || !opts.name) {
    logError('Both <type> and <name> are required')
    process.exit(1)
  }
  return { type: opts.type, name: opts.name }
}
