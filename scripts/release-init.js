#!/usr/bin/env bun
import { logError } from './git-flow.js'
import { parseFlags, releaseInitDefaults } from './lib/options.js'
import { handleBranchOperation } from './operations/branch-operation.js'
import { hotfixConfig } from './operations/hotfix.js'
import { releaseConfig } from './operations/release.js'

function printHelp() {
  console.log(`
${'\x1b[1m'}Git Flow Release/Hotfix Initiator${'\x1b[0m'}

Usage: bun scripts/release-init.js [options]

Options:
  --type <release|hotfix>   Branch type (default: release)
  --bump <patch|minor|major> Auto bump from current version
  --version <x.y.z>         Explicit version
  --push                    Push new branch and commit
  --dry-run                 Print actions without executing
  --no-changelog            Skip changelog update
  --offline                 Skip remote checks/pulls
  --yes                     Non-interactive (assume yes)
  -h, --help                Show help

Examples:
  bun scripts/release-init.js --type release --bump minor
  bun scripts/release-init.js --type hotfix --version 1.2.3
  bun scripts/release-init.js --push --yes
`)
}

async function main() {
  /** @type {import('./lib/options.js').ReleaseInitOpts} */
  const opts = parseFlags(process.argv.slice(2), releaseInitDefaults)

  if (opts.help) {
    printHelp()
    process.exit(0)
  }

  if (!opts.bump && !opts.version) {
    opts.bump = opts.type === 'hotfix' ? 'patch' : 'minor'
  }

  if (opts.type === 'hotfix') {
    await handleBranchOperation('start', opts, hotfixConfig)
  } else {
    await handleBranchOperation('start', opts, releaseConfig)
  }

  // Close stdin to prevent hanging
  process.stdin.pause()
}

main().catch((error) => {
  if (!error || error.name !== 'GuardError') {
    logError(`Unexpected error: ${error.message}`)
  }
  process.exit(1)
})
