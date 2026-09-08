// ============================================================================
// Tests for the six branch/config command handlers that lacked direct
// coverage: init, config, delete, publish, track, list. start/finish have
// their own files (start.test.js, finish.test.js).
//
// All six resolve the same module specifiers (../git-flow.js and, for all
// but init, ../lib/core.js), so a single mock.module registry covers every
// handler under test.
// ============================================================================

import { afterEach, beforeAll, describe, expect, mock, test } from 'bun:test'

let exit = 0

process.exit = (code) => {
  exit = code
  throw new Error(`__EXIT__${code}__`)
}

let requireValidResult = true
let gitCalls = []
let branchExistsCalls = []
let listCalls = []
let consoleOut = []

// Capture console.log/error so handlers that print config / lists are
// assertable without polluting test output.

console.log = (...args) => {
  consoleOut.push(args.join(' '))
}

mock.module('../lib/core.js', () => ({
  requireValidCommand(_opts, _cfg) {
    return requireValidResult
  }
}))

mock.module('../git-flow.js', () => ({
  COLOR_BOLD: '',
  COLOR_RESET: '',
  ensureBranchExists(name) {
    branchExistsCalls.push(name)
  },
  ensureGitFlowAvailable() {
    return available
  },
  getGitFlowConfig() {
    return {
      master: 'main',
      develop: 'develop',
      featurePrefix: 'feature/',
      releasePrefix: 'release/',
      hotfixPrefix: 'hotfix/',
      supportPrefix: 'support/'
    }
  },
  listBranchesByType(type) {
    listCalls.push(type)
    return listResults[type] || []
  },
  logError: () => {},
  logInfo: () => {},
  logSuccess: () => {},
  logWarn: () => {},
  runGitFlow(args, opts) {
    gitCalls.push({ fn: 'runGitFlow', args, opts })
    return args.includes('config') ? 'gitflow config output' : ''
  },
  runGit(args, opts) {
    gitCalls.push({ fn: 'runGit', args, opts })
    return 'feature/\n'
  }
}))

let available = true
const listResults = {}

let handlers
let handlersModules

beforeAll(async () => {
  handlersModules = await Promise.all([
    import('./init.js'),
    import('./config.js'),
    import('./delete.js'),
    import('./publish.js'),
    import('./track.js'),
    import('./list.js')
  ])
  handlers = {
    init: handlersModules[0],
    config: handlersModules[1],
    delete: handlersModules[2],
    publish: handlersModules[3],
    track: handlersModules[4],
    list: handlersModules[5]
  }
})

afterEach(() => {
  exit = 0
  gitCalls = []
  requireValidResult = true
  branchExistsCalls = []
  listCalls = []
  listResults.feature = []
  consoleOut = []
  available = true
})

const safeHandle = async (fn, opts) => {
  try {
    await fn(opts)
  } catch (e) {
    if (!String(e.message).startsWith('__EXIT__')) throw e
  }
}

describe('handleInit', () => {
  test('exits when git-flow is unavailable', async () => {
    available = false
    await safeHandle(handlers.init.handleInit, {})
    expect(exit).toBe(1)
    expect(gitCalls).toHaveLength(0)
  })

  test('runs git-flow init -d with dryRun forwarded', async () => {
    await safeHandle(handlers.init.handleInit, { dryRun: true })
    const call = gitCalls.find(
      (c) => c.fn === 'runGitFlow' && c.args === 'init -d'
    )
    expect(call).toBeDefined()
    expect(call.opts.dryRun).toBe(true)
  })

  test('queries config after init and prints it', async () => {
    await safeHandle(handlers.init.handleInit, {})
    const cfg = gitCalls.find(
      (c) => c.fn === 'runGitFlow' && c.args === 'config'
    )
    expect(cfg).toBeDefined()
    expect(consoleOut.join(' ')).toContain('gitflow config output')
  })
})

describe('handleConfig', () => {
  test('returns early when requireValidCommand fails', async () => {
    requireValidResult = false
    await safeHandle(handlers.config.handleConfig, { list: true })
    expect(gitCalls).toHaveLength(0)
  })

  test('no action and no flags prints help', async () => {
    await safeHandle(handlers.config.handleConfig, {})
    expect(consoleOut.join(' ')).toContain('Git Flow Config')
  })

  test('--list prints all config keys from getGitFlowConfig', async () => {
    await safeHandle(handlers.config.handleConfig, { list: true })
    const out = consoleOut.join(' ')
    expect(out).toContain('Master branch: main')
    expect(out).toContain('Develop branch: develop')
    expect(out).toContain('Feature prefix: feature/')
    expect(out).toContain('Support prefix: support/')
  })

  test('--get runs git config --get with allowFail', async () => {
    await safeHandle(handlers.config.handleConfig, {
      get: 'gitflow.prefix.feature'
    })
    const call = gitCalls.find((c) => c.fn === 'runGit')
    expect(call.args).toBe('config --get gitflow.prefix.feature')
    expect(call.opts.allowFail).toBe(true)
  })

  test('--get prints the returned value', async () => {
    await safeHandle(handlers.config.handleConfig, { get: 'x.y' })
    expect(consoleOut.join(' ')).toContain('feature/')
  })

  test('--set writes key and value via git config', async () => {
    await safeHandle(handlers.config.handleConfig, {
      set: ['gitflow.prefix.feature', 'feat/']
    })
    const call = gitCalls.find((c) => c.fn === 'runGit')
    expect(call.args).toBe('config gitflow.prefix.feature feat/')
  })

  test('--set with missing value exits 1', async () => {
    await safeHandle(handlers.config.handleConfig, { set: ['key'] })
    expect(exit).toBe(1)
  })
})

describe('handleDelete', () => {
  test('exits when type or name missing', async () => {
    await safeHandle(handlers.delete.handleDelete, { name: 'x' })
    expect(exit).toBe(1)
    await safeHandle(handlers.delete.handleDelete, { type: 'feature' })
    expect(exit).toBe(1)
  })

  test('checks branch exists then runs "<type> delete <name>"', async () => {
    await safeHandle(handlers.delete.handleDelete, {
      type: 'feature',
      name: 'new-auth'
    })
    expect(branchExistsCalls).toEqual(['feature/new-auth'])
    const call = gitCalls.find((c) => c.fn === 'runGitFlow')
    expect(call.args).toBe('feature delete new-auth')
  })

  test('forwards dryRun to runGitFlow', async () => {
    await safeHandle(handlers.delete.handleDelete, {
      type: 'hotfix',
      name: 'x',
      dryRun: true
    })
    const call = gitCalls.find((c) => c.fn === 'runGitFlow')
    expect(call.opts.dryRun).toBe(true)
  })
})

describe('handlePublish', () => {
  test('exits when type or name missing', async () => {
    await safeHandle(handlers.publish.handlePublish, {})
    expect(exit).toBe(1)
  })

  test('checks branch exists then runs "<type> publish <name>"', async () => {
    await safeHandle(handlers.publish.handlePublish, {
      type: 'release',
      name: 'v1.2.0'
    })
    expect(branchExistsCalls).toEqual(['release/v1.2.0'])
    const call = gitCalls.find((c) => c.fn === 'runGitFlow')
    expect(call.args).toBe('release publish v1.2.0')
  })

  test('forwards dryRun', async () => {
    await safeHandle(handlers.publish.handlePublish, {
      type: 'feature',
      name: 'x',
      dryRun: true
    })
    const call = gitCalls.find((c) => c.fn === 'runGitFlow')
    expect(call.opts.dryRun).toBe(true)
  })
})

describe('handleTrack', () => {
  test('exits when type or name missing', async () => {
    await safeHandle(handlers.track.handleTrack, { type: 'feature' })
    expect(exit).toBe(1)
  })

  test('runs "<type> track <name>" (no branch existence check)', async () => {
    await safeHandle(handlers.track.handleTrack, {
      type: 'support',
      name: 'v1-0-x'
    })
    expect(branchExistsCalls).toHaveLength(0)
    const call = gitCalls.find((c) => c.fn === 'runGitFlow')
    expect(call.args).toBe('support track v1-0-x')
  })

  test('forwards dryRun', async () => {
    await safeHandle(handlers.track.handleTrack, {
      type: 'feature',
      name: 'x',
      dryRun: true
    })
    const call = gitCalls.find((c) => c.fn === 'runGitFlow')
    expect(call.opts.dryRun).toBe(true)
  })
})

describe('handleList', () => {
  test('with type, lists branches returned by listBranchesByType', async () => {
    listResults.feature = ['feature/a', 'feature/b']
    await safeHandle(handlers.list.handleList, { type: 'feature' })
    expect(listCalls).toEqual(['feature'])
    const out = consoleOut.join(' ')
    expect(out).toContain('feature/a')
    expect(out).toContain('feature/b')
  })

  test('with type but no branches logs info, prints nothing', async () => {
    await safeHandle(handlers.list.handleList, { type: 'hotfix' })
    expect(listCalls).toEqual(['hotfix'])
    expect(consoleOut.join(' ')).not.toContain('  -')
  })

  test('without type, queries all four branch types', async () => {
    await safeHandle(handlers.list.handleList, {})
    expect(listCalls).toEqual(['feature', 'release', 'hotfix', 'support'])
  })

  test('without type and no branches anywhere logs empty message', async () => {
    await safeHandle(handlers.list.handleList, {})
    // No branches: foundAny stays false, nothing non-whitespace printed.
    expect(consoleOut.join(' ').trim()).toBe('')
  })
})

describe('printHelp banners', () => {
  test('each handler exports a printHelp that logs its banner', () => {
    for (const name of [
      'init',
      'config',
      'delete',
      'publish',
      'track',
      'list'
    ]) {
      const banner = {
        init: 'Git Flow Init',
        config: 'Git Flow Config',
        delete: 'Git Flow Delete',
        publish: 'Git Flow Publish',
        track: 'Git Flow Track',
        list: 'Git Flow List'
      }[name]
      consoleOut = []
      handlers[name].printHelp()
      expect(consoleOut.join(' ')).toContain(banner)
    }
  })
})
