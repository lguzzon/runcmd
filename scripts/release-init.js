#!/usr/bin/env bun
import { parseArgs, logError } from './git-flow.js'
import { handleHotfix } from './operations/hotfix.js'
import { handleRelease } from './operations/release.js'

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
  const rawArgs = process.argv.slice(2)

  if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
    printHelp()
    process.exit(0)
  }

  // Detect --type from raw args to determine git-flow command routing
  const typeIdx = rawArgs.indexOf('--type')
  const type =
    typeIdx !== -1 && typeIdx + 1 < rawArgs.length
      ? rawArgs[typeIdx + 1]
      : 'release'

  // Strip --type and its value from args before passing to git-flow.js parseArgs
  const strippedArgs = []
  for (let i = 0; i < rawArgs.length; i++) {
    if (rawArgs[i] === '--type') {
      i += 1 // skip value
      continue
    }
    strippedArgs.push(rawArgs[i])
  }

  // Prepend command and subcommand, then delegate parsing to git-flow.js
  const mappedArgs = [type, 'start', ...strippedArgs]
  const opts = parseArgs(mappedArgs)

  if (process.env.CI === 'true') {
    opts.yes = true
  }

  if (!opts.bump && !opts.version) {
    opts.bump = type === 'hotfix' ? 'patch' : 'minor'
  }

  if (type === 'hotfix') {
    await handleHotfix('start', opts)
  } else {
    await handleRelease('start', opts)
  }

  // Close stdin to prevent hanging
  process.stdin.pause()
}

main().catch((error) => {
  logError(`Unexpected error: ${error.message}`)
  process.exit(1)
})
