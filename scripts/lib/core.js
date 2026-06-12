#!/usr/bin/env bun
import {
  ensureGitFlowAvailable,
  ensureGitFlowInitialized,
  logError
} from '../git-flow.js'

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
