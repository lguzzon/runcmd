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

// ============================================================================
// Local imports — for CLI dispatch only
// ============================================================================
import {
  COLOR_BOLD,
  COLOR_RESET,
  logError,
  logInfo,
  logWarn
} from './lib/logger.js'

import { runGit } from './lib/git.js'

import { ensureGitFlowAvailable } from './lib/installer.js'

// Import command handlers
import {
  handleConfig as handleConfigCommand,
  printHelp as printConfigHelp
} from './commands/config.js'
import {
  handleDelete as handleDeleteCommand,
  printHelp as printDeleteHelp
} from './commands/delete.js'
import {
  handleFinish as handleFinishCommand,
  printHelp as printFinishHelp
} from './commands/finish.js'
import {
  handleInit as handleInitCommand,
  printHelp as printInitHelp
} from './commands/init.js'
import {
  handleList as handleListCommand,
  printHelp as printListHelp
} from './commands/list.js'
import {
  handlePublish as handlePublishCommand,
  printHelp as printPublishHelp
} from './commands/publish.js'
import {
  handleStart as handleStartCommand,
  printHelp as printStartHelp
} from './commands/start.js'
import {
  handleTrack as handleTrackCommand,
  printHelp as printTrackHelp
} from './commands/track.js'

import {
  handleClone as handleCloneOperation,
  printHelp as printCloneHelp
} from './operations/clone.js'
import {
  handleHotfix as handleHotfixOperation,
  printHelp as printHotfixHelp
} from './operations/hotfix.js'
import {
  handleRelease as handleReleaseOperation,
  printHelp as printReleaseHelp
} from './operations/release.js'
import {
  handleSync as handleSyncOperation,
  printHelp as printSyncHelp
} from './operations/sync.js'

// ============================================================================
// Command registry — OCP-friendly: add a new entry, no switch-case edits needed
// ============================================================================

/** @type {Record<string, { handler: (opts: any) => Promise<void>, help: () => void }>} */
const COMMANDS = {
  init: { handler: handleInitCommand, help: printInitHelp },
  start: { handler: handleStartCommand, help: printStartHelp },
  finish: { handler: handleFinishCommand, help: printFinishHelp },
  publish: { handler: handlePublishCommand, help: printPublishHelp },
  track: { handler: handleTrackCommand, help: printTrackHelp },
  delete: { handler: handleDeleteCommand, help: printDeleteHelp },
  list: { handler: handleListCommand, help: printListHelp },
  config: { handler: handleConfigCommand, help: printConfigHelp },
  sync: { handler: handleSyncOperation, help: printSyncHelp },
  clone: { handler: handleCloneOperation, help: printCloneHelp },
  release: { handler: handleReleaseOperation, help: printReleaseHelp },
  hotfix: { handler: handleHotfixOperation, help: printHotfixHelp }
}

// --- Help display ---

function printHelp() {
  console.log(`
${COLOR_BOLD}Git Flow helper${COLOR_RESET}

Usage: bun scripts/git-flow.js <command> [options]

${COLOR_BOLD}Core Commands:${COLOR_RESET}
  help                          Show this help message
  install [--auto-install]      Ensure git-flow is available; optionally install
  init                          Initialize git-flow in current repository
  config [--get|--set|--list]   Get or set Git Flow configuration

${COLOR_BOLD}Branch Commands:${COLOR_RESET}
  start <type> <name>           Start a new branch (feature/release/hotfix/support)
  finish <type> <name>          Finish and merge a branch
  publish <type> <name>         Publish a branch to remote
  track <type> <name>           Track a remote branch locally
  delete <type> <name>          Delete a branch
  list [type]                   List branches by type

${COLOR_BOLD}High-Level Operations:${COLOR_RESET}
  clone <url> [dir]             Clone repo and initialize git-flow
  sync [--offline] [--dry-run]  Sync main/master & develop (stash-safe)
  release <action>              Manage release branches (start/finish)
  hotfix <action>               Manage hotfix branches (start/finish)

${COLOR_BOLD}Examples:${COLOR_RESET}
  bun scripts/git-flow.js init
  bun scripts/git-flow.js start feature new-auth
  bun scripts/git-flow.js finish feature new-auth
  bun scripts/git-flow.js release start --bump minor
  bun scripts/git-flow.js hotfix finish --tag v1.1.1 --message "Hotfix"
  bun scripts/git-flow.js sync --dry-run

${COLOR_BOLD}For detailed help on any command:${COLOR_RESET}
  bun scripts/git-flow.js <command> --help
`)
}

// --- Argument parsing ---

export function parseArgs(argv) {
  const args = [...argv]
  const next = () => args.shift()
  const takeValue = (flag) => {
    const v = next()
    if (!v) {
      logError(`${flag} requires a value`)
      process.exit(1)
    }
    return v
  }

  const command = next()
  const nextArg = next()
  let sub = null
  if (
    command &&
    [
      'release',
      'hotfix',
      'start',
      'finish',
      'publish',
      'track',
      'delete'
    ].includes(command)
  ) {
    if (nextArg && nextArg !== '--help' && nextArg !== '-h') {
      sub = nextArg
    } else if (nextArg === '--help' || nextArg === '-h') {
      args.unshift(nextArg)
    }
  } else if (nextArg === '--help' || nextArg === '-h') {
    args.unshift(nextArg)
  }

  const opts = {
    command,
    sub,
    name: 'nextRelease',
    base: null,
    force: false,
    tag: undefined,
    message: undefined,
    push: false,
    keepBranch: false,
    offline: false,
    dryRun: false,
    autoInstall: false,
    targetDir: undefined,
    cloneUrl: undefined,
    type: undefined,
    bump: undefined,
    version: undefined,
    fetch: false,
    squash: false,
    noChangelog: false,
    yes: false,
    get: undefined,
    set: undefined,
    list: false
  }

  while (args.length) {
    const arg = next()
    switch (arg) {
      case '--name':
        opts.name = takeValue('--name')
        break
      case '--base':
        opts.base = takeValue('--base')
        break
      case '--force':
      case '-f':
        opts.force = true
        break
      case '--tag':
        opts.tag = takeValue('--tag')
        break
      case '--message':
        opts.message = takeValue('--message')
        break
      case '--push':
        opts.push = true
        break
      case '--keep-branch':
        opts.keepBranch = true
        break
      case '--offline':
        opts.offline = true
        break
      case '--dry-run':
        opts.dryRun = true
        break
      case '--auto-install':
        opts.autoInstall = true
        break
      case '--type':
        opts.type = takeValue('--type')
        break
      case '--bump':
        opts.bump = takeValue('--bump')
        break
      case '--version':
        opts.version = takeValue('--version')
        break
      case '--fetch':
        opts.fetch = true
        break
      case '--squash':
        opts.squash = true
        break
      case '--no-changelog':
        opts.noChangelog = true
        break
      case '--yes':
        opts.yes = true
        break
      case '--get':
        opts.get = takeValue('--get')
        break
      case '--set':
        opts.set = [takeValue('--set'), takeValue('value')]
        break
      case '--list':
        if (opts.command !== 'list') opts.list = true
        break
      case '--help':
      case '-h':
        opts.help = true
        break
      default:
        if (!opts.cloneUrl) {
          opts.cloneUrl = arg
        } else if (!opts.targetDir) {
          opts.targetDir = arg
        } else if (
          !opts.type &&
          ['feature', 'release', 'hotfix', 'support'].includes(arg)
        ) {
          opts.type = arg
        } else if (
          !opts.name &&
          arg !== 'start' &&
          arg !== 'finish' &&
          arg !== 'publish' &&
          arg !== 'track' &&
          arg !== 'delete'
        ) {
          opts.name = arg
        } else {
          logWarn(`Ignoring unknown argument: ${arg}`)
        }
    }
  }
  return opts
}

// --- Install command handler ---

function handleInstall(opts) {
  const available = ensureGitFlowAvailable(opts)
  if (!available) return
  const inRepo =
    runGit('rev-parse --is-inside-work-tree', { allowFail: true }) === 'true'
  if (inRepo) {
    logInfo('Initializing git-flow (default answers)...')
    runGit('flow init -d', { dryRun: opts.dryRun })
  } else {
    logWarn('Not inside a git repository; skipped git-flow init')
  }
}

// --- Main CLI dispatch ---

async function main() {
  const argv = process.argv.slice(2)
  if (argv.length === 0) {
    printHelp()
    process.exit(0)
  }
  const opts = parseArgs(argv)

  // Help dispatch — registry lookup with fallback
  if (opts.help) {
    const cmd = COMMANDS[opts.command]
    if (cmd) {
      cmd.help()
      return
    }
    printHelp()
    return
  }

  // Route command
  switch (opts.command) {
    case 'help':
    case '--help':
    case '-h':
      printHelp()
      return
    case 'install':
      handleInstall(opts)
      return
    default: {
      const cmd = COMMANDS[opts.command]
      if (cmd) {
        // release/hotfix need sub as first positional arg
        if (opts.command === 'release') {
          await handleReleaseOperation(opts.sub, opts)
        } else if (opts.command === 'hotfix') {
          await handleHotfixOperation(opts.sub, opts)
        } else {
          await cmd.handler(opts)
        }
        return
      }
      logError(`Unknown command: ${opts.command}`)
    }
  }

  printHelp()
  process.exit(1)
}

// Only execute main() when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logError(`Unexpected error: ${error.message}`)
    process.exit(1)
  })
}
