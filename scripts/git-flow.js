#!/usr/bin/env bun

// ============================================================================
// Re-exports from lib/ — backward compatible
// ============================================================================
export {
  COLOR_INFO,
  COLOR_WARN,
  COLOR_ERROR,
  COLOR_RESET,
  COLOR_BOLD,
  logInfo,
  logWarn,
  logError,
  logSuccess
} from './lib/logger.js'

export { runGit, runGitFlow } from './lib/git.js'

export {
  checkout,
  currentBranch,
  detectMainBranch,
  ensureBranchExists,
  ensureBranchMissing,
  ensureCleanTree,
  ensureGitFlowInitialized,
  ensureTagMissing,
  getBranchType,
  getGitFlowConfig,
  listBranchesByType,
  mergeBranch,
  pullBranch,
  pushBranch,
  stashPop,
  stashPush,
  validateBranchName
} from './lib/validators.js'

export { ensureGitFlowAvailable } from './lib/installer.js'

// Re-export shared utilities (these are also consumed by release scripts)
export * from './lib/changelog.js'
export * from './lib/prompts.js'
export * from './lib/version.js'
export {
  parseFlags,
  releaseInitDefaults,
  releaseFinalizeDefaults
} from './lib/options.js'

// Re-export `parseArgs` from cli.js for tests and external callers.
export { parseArgs } from './cli.js'

// When invoked directly, hand off to the CLI dispatcher's `main()`.
import { main } from './cli.js'
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    if (!error || error.name !== 'GuardError') {
      console.error(`[ERROR] Unexpected error: ${error.message}`)
    }
    process.exit(1)
  })
}
