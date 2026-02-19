#!/usr/bin/env bun
import {handleHotfix} from "./operations/hotfix.js"
import {handleRelease} from "./operations/release.js"

const defaultOptions = {
  type: "release", // release|hotfix
  bump: undefined, // patch|minor|major
  version: undefined,
  push: false,
  dryRun: false,
  yes: false,
  noChangelog: false,
  offline: false,
  help: false
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {...defaultOptions}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case "--type":
        opts.type = args[++i] || opts.type
        break
      case "--bump":
        opts.bump = args[++i]
        break
      case "--version":
        opts.version = args[++i]
        break
      case "--push":
        opts.push = true
        break
      case "--dry-run":
        opts.dryRun = true
        break
      case "--yes":
        opts.yes = true
        break
      case "--no-changelog":
        opts.noChangelog = true
        break
      case "--offline":
        opts.offline = true
        break
      case "--help":
      case "-h":
        opts.help = true
        break
      default:
        // Ignore unknown arguments for backward compatibility
        break
    }
  }

  if (process.env.CI === "true") {
    opts.yes = true
  }

  if (!opts.bump && !opts.version) {
    opts.bump = opts.type === "hotfix" ? "patch" : "minor"
  }

  return opts
}

function printHelp() {
  console.log(`
${"\x1b[1m"}Git Flow Release/Hotfix Initiator${"\x1b[0m"}

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
  const opts = parseArgs()

  if (opts.help) {
    printHelp()
    process.exit(0)
  }

  // Map to git-flow.js operation
  const action = "start"
  const type = opts.type

  if (type === "hotfix") {
    await handleHotfix(action, opts)
  } else {
    await handleRelease(action, opts)
  }

  // Close stdin to prevent hanging
  process.stdin.pause()
}

main().catch(error => {
  console.error(
    `${"\x1b[31m"}[ERROR]${"\x1b[0m"} Unexpected error: ${error.message}`
  )
  process.exit(1)
})
