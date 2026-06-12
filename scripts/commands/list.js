#!/usr/bin/env bun
import { requireValidCommand } from '../lib/core.js'
import {
  COLOR_BOLD,
  COLOR_RESET,
  listBranchesByType,
  logInfo,
  logSuccess
} from '../git-flow.js'

export function printHelp() {
  console.log(`
${COLOR_BOLD}Git Flow List${COLOR_RESET}

Usage: bun scripts/git-flow.js list [type] [options]

List branches of the specified type.

Arguments:
  type                      Branch type: feature, release, hotfix, support (optional, lists all if omitted)

Options:
  -h, --help                Show this help message

Examples:
  bun scripts/git-flow.js list
  bun scripts/git-flow.js list feature
  bun scripts/git-flow.js list release
`)
}

export async function handleList(opts) {
  if (!requireValidCommand(opts, { commandName: 'list', helpFn: printHelp }))
    return

  const { type } = opts

  if (type) {
    const branches = listBranchesByType(type)
    if (branches.length === 0) {
      logInfo(`No ${type} branches found.`)
    } else {
      logSuccess(`${type} branches:`)
      branches.forEach((branch) => {
        console.log(`  - ${branch}`)
      })
    }
  } else {
    const types = ['feature', 'release', 'hotfix', 'support']
    let foundAny = false

    types.forEach((t) => {
      const branches = listBranchesByType(t)
      if (branches.length > 0) {
        if (!foundAny) {
          foundAny = true
          console.log()
        }
        logSuccess(`${t} branches:`)
        branches.forEach((branch) => {
          console.log(`  - ${branch}`)
        })
      }
    })

    if (!foundAny) {
      logInfo('No Git Flow branches found.')
    }
  }
}
