#!/usr/bin/env bun
import { ensureGitFlowAvailable } from './installer.js'
import { ensureGitFlowInitialized } from './validators.js'
import { logError } from './logger.js'

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
