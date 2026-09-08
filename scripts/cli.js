#!/usr/bin/env bun

// ============================================================================
// CLI dispatch — argument parsing, command registry, and main() entry point.
// Extracted from git-flow.js to keep that file a pure re-export hub.
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
import { handleBranchOperation } from './operations/branch-operation.js'
import {
  printHelp as printHotfixHelp,
  hotfixConfig
} from './operations/hotfix.js'
import {
  printHelp as printReleaseHelp,
  releaseConfig
} from './operations/release.js'
import {
  handleSync as handleSyncOperation,
  printHelp as printSyncHelp
} from './operations/sync.js'

/** @type {Record<string, { handler: (action: string, opts: any) => Promise<void>, help: () => void, config: import('./operations/branch-operation.js').BranchOperationConfig }>} */
const BRANCH_OPERATIONS = {
  release: {
    handler: handleBranchOperation,
    help: printReleaseHelp,
    config: releaseConfig
  },
  hotfix: {
    handler: handleBranchOperation,
    help: printHotfixHelp,
    config: hotfixConfig
  }
}

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
  release: { handler: handleBranchOperation, help: printReleaseHelp },
  hotfix: { handler: handleBranchOperation, help: printHotfixHelp }
}

// --- Help display ---

/**
 * Print the top-level git-flow helper usage banner.
 * @returns {void}
 */
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

/**
 * Parse a CLI argv array into the structured `opts` consumed by command
 * handlers. Detects a subcommand slot for branch-action commands
 * (release/hotfix/start/finish/publish/track/delete) and folds the rest of
 * the argv into the known flag set.
 *
 * @param {string[]} argv process argv slice
 * @returns {{
 *   command: string | undefined,
 *   sub: string | null,
 *   name: string | undefined,
 *   base: string | null,
 *   force: boolean,
 *   tag: string | undefined,
 *   message: string | undefined,
 *   push: boolean,
 *   keepBranch: boolean,
 *   offline: boolean,
 *   dryRun: boolean,
 *   autoInstall: boolean,
 *   targetDir: string | undefined,
 *   cloneUrl: string | undefined,
 *   type: string | undefined,
 *   bump: string | undefined,
 *   version: string | undefined,
 *   fetch: boolean,
 *   squash: boolean,
 *   noChangelog: boolean,
 *   yes: boolean,
 *   get: string | undefined,
 *   set: [string, string] | undefined,
 *   list: boolean,
 *   help?: boolean
 * }} parsed options
 */
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
    if (nextArg && !nextArg.startsWith('-')) {
      sub = nextArg
    } else if (nextArg) {
      // Flag in the sub slot (--name, --help, etc.) — hand it back to the
      // main flag loop instead of swallowing it as the subcommand.
      args.unshift(nextArg)
    }
  } else if (nextArg === '--help' || nextArg === '-h') {
    args.unshift(nextArg)
  }

  const opts = {
    command,
    sub,
    name: undefined,
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

/**
 * Handle the top-level `install` command: ensure git-flow is available and,
 * when inside a repository, run `git flow init -d`.
 *
 * @param {object} opts parsed CLI options (dryRun, autoInstall)
 * @returns {void}
 */
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

/**
 * CLI entry point: parse argv, dispatch to the matching command handler,
 * print help on `--help` or unknown commands. Exits 0 on success, 1 on
 * failure or unknown command.
 *
 * @returns {Promise<void>}
 */
export async function main() {
  const argv = process.argv.slice(2)
  if (argv.length === 0) {
    printHelp()
    process.exit(0)
  }
  const opts = parseArgs(argv)

  if (opts.help) {
    const cmd = COMMANDS[opts.command]
    if (cmd) {
      cmd.help()
      return
    }
    printHelp()
    return
  }

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
        const branchOp = BRANCH_OPERATIONS[opts.command]
        if (branchOp) {
          await branchOp.handler(opts.sub, opts, branchOp.config)
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
    if (!error || error.name !== 'GuardError') {
      logError(`Unexpected error: ${error.message}`)
    }
    process.exit(1)
  })
}
