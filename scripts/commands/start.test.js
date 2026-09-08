import { afterEach, beforeAll, describe, expect, mock, test } from 'bun:test'

let exit = 0

process.exit = (code) => {
  exit = code
  throw new Error(`__EXIT__${code}__`)
}

let requireValidResult = true
let requireValidSeen = null
let cleanTreeCalls = 0
let branchExistsCalls = []
let branchMissingCalls = []
let pullBranchCalls = []
let gitCalls = []

mock.module('../lib/core.js', () => ({
  requireValidCommand(opts, cfg) {
    requireValidSeen = { opts, cfg }
    return requireValidResult
  }
}))

mock.module('../git-flow.js', () => ({
  COLOR_BOLD: '',
  COLOR_RESET: '',
  ensureBranchExists(name) {
    branchExistsCalls.push(name)
  },
  ensureBranchMissing(name) {
    branchMissingCalls.push(name)
  },
  ensureCleanTree() {
    cleanTreeCalls++
  },
  logError: () => {},
  logInfo: () => {},
  logSuccess: () => {},
  logWarn: () => {},
  pullBranch(name, opts) {
    pullBranchCalls.push({ name, opts })
  },
  runGit(args, opts) {
    gitCalls.push({ fn: 'runGit', args, opts })
    return ''
  },
  runGitFlow(args, opts) {
    gitCalls.push({ fn: 'runGitFlow', args, opts })
    return ''
  },
  validateBranchName(name, _type) {
    return /^[\w-]+$/.test(name)
  }
}))

let start

beforeAll(async () => {
  start = await import('./start.js')
})

afterEach(() => {
  gitCalls = []
  requireValidResult = true
  requireValidSeen = null
  cleanTreeCalls = 0
  branchExistsCalls = []
  branchMissingCalls = []
  pullBranchCalls = []
  exit = 0
})

const safeHandle = async (opts) => {
  try {
    await start.handleStart(opts)
  } catch (e) {
    if (!String(e.message).startsWith('__EXIT__')) throw e
  }
}

describe('handleStart — requireValidCommand gate', () => {
  test('returns early when requireValidCommand returns false', async () => {
    requireValidResult = false
    await safeHandle({ type: 'feature', name: 'x' })
    expect(cleanTreeCalls).toBe(0)
    expect(gitCalls).toHaveLength(0)
  })

  test('passes opts and { commandName, helpFn } to requireValidCommand', async () => {
    const opts = { type: 'feature', name: 'x' }
    await safeHandle(opts)
    expect(requireValidSeen).not.toBeNull()
    expect(requireValidSeen.opts).toBe(opts)
    expect(requireValidSeen.cfg.commandName).toBe('start')
    expect(requireValidSeen.cfg.helpFn).toBe(start.printHelp)
  })
})

describe('handleStart — required args', () => {
  test('exits when type is missing', async () => {
    await safeHandle({ name: 'x' })
    expect(exit).toBe(1)
    expect(gitCalls.filter((c) => c.fn === 'runGitFlow')).toHaveLength(0)
  })

  test('exits when name is missing', async () => {
    await safeHandle({ type: 'feature' })
    expect(exit).toBe(1)
    expect(gitCalls.filter((c) => c.fn === 'runGitFlow')).toHaveLength(0)
  })

  test('exits when both type and name are missing', async () => {
    await safeHandle({})
    expect(exit).toBe(1)
    expect(gitCalls.filter((c) => c.fn === 'runGitFlow')).toHaveLength(0)
  })
})

describe('handleStart — branch name validation', () => {
  test('exits when name contains a space', async () => {
    await safeHandle({ type: 'feature', name: 'foo bar' })
    expect(exit).toBe(1)
    expect(gitCalls.filter((c) => c.fn === 'runGitFlow')).toHaveLength(0)
  })
})

describe('handleStart — base branch defaulting', () => {
  test('hotfix defaults to main', async () => {
    await safeHandle({ type: 'hotfix', name: 'fix-login' })
    expect(branchExistsCalls).toContain('main')
    expect(branchExistsCalls).not.toContain('develop')
  })

  test('support defaults to main', async () => {
    await safeHandle({ type: 'support', name: 'v1-0-x' })
    expect(branchExistsCalls).toContain('main')
    expect(branchExistsCalls).not.toContain('develop')
  })

  test('feature defaults to develop', async () => {
    await safeHandle({ type: 'feature', name: 'new-auth' })
    expect(branchExistsCalls).toContain('develop')
    expect(branchExistsCalls).not.toContain('main')
  })

  test('release defaults to develop', async () => {
    await safeHandle({ type: 'release', name: 'v1-2-0' })
    expect(branchExistsCalls).toContain('develop')
    expect(branchExistsCalls).not.toContain('main')
  })

  test('explicit --base overrides default for feature', async () => {
    await safeHandle({ type: 'feature', name: 'x', base: 'main' })
    expect(branchExistsCalls).toEqual(['main'])
  })

  test('explicit --base overrides default for hotfix', async () => {
    await safeHandle({ type: 'hotfix', name: 'x', base: 'develop' })
    expect(branchExistsCalls).toEqual(['develop'])
  })

  test('explicit --base is appended to the git-flow start command', async () => {
    await safeHandle({ type: 'feature', name: 'x', base: 'main' })
    const gfCall = gitCalls.find((c) => c.fn === 'runGitFlow')
    expect(gfCall.args).toBe('feature start x main')
  })
})

describe('handleStart — force flag', () => {
  test('--force triggers "branch -D <branch>" before start', async () => {
    await safeHandle({ type: 'feature', name: 'new-auth', force: true })
    const del = gitCalls.find(
      (c) => c.fn === 'runGit' && c.args.startsWith('branch -D ')
    )
    expect(del).toBeDefined()
    expect(del.args).toBe('branch -D feature/new-auth')
    expect(branchMissingCalls).toHaveLength(0)
  })

  test('without --force, ensureBranchMissing is called instead', async () => {
    await safeHandle({ type: 'feature', name: 'new-auth' })
    const del = gitCalls.find(
      (c) => c.fn === 'runGit' && c.args.startsWith('branch -D ')
    )
    expect(del).toBeUndefined()
    expect(branchMissingCalls).toEqual(['feature/new-auth'])
  })

  test('--force forwards dryRun to the delete call', async () => {
    await safeHandle({
      type: 'feature',
      name: 'x',
      force: true,
      dryRun: true
    })
    const del = gitCalls.find(
      (c) => c.fn === 'runGit' && c.args.startsWith('branch -D ')
    )
    expect(del.opts.dryRun).toBe(true)
  })
})

describe('handleStart — fetch flag', () => {
  test('--fetch triggers pullBranch on the resolved base branch', async () => {
    await safeHandle({ type: 'feature', name: 'x', fetch: true })
    expect(pullBranchCalls).toHaveLength(1)
    expect(pullBranchCalls[0].name).toBe('develop')
    expect(pullBranchCalls[0].opts.dryRun).toBeUndefined()
  })

  test('--fetch is skipped in offline mode', async () => {
    await safeHandle({
      type: 'feature',
      name: 'x',
      fetch: true,
      offline: true
    })
    expect(pullBranchCalls).toHaveLength(0)
  })

  test('--fetch on hotfix pulls main', async () => {
    await safeHandle({ type: 'hotfix', name: 'fix-login', fetch: true })
    expect(pullBranchCalls[0].name).toBe('main')
  })

  test('no --fetch means no pullBranch call', async () => {
    await safeHandle({ type: 'feature', name: 'x' })
    expect(pullBranchCalls).toHaveLength(0)
  })
})

describe('handleStart — git-flow command construction', () => {
  test('builds "<type> start <name>" with no trailing base when defaulted', async () => {
    await safeHandle({ type: 'feature', name: 'x' })
    const gfCall = gitCalls.find((c) => c.fn === 'runGitFlow')
    expect(gfCall.args).toBe('feature start x')
  })

  test('forwards dryRun=true to runGitFlow', async () => {
    await safeHandle({ type: 'feature', name: 'x', dryRun: true })
    const gfCall = gitCalls.find((c) => c.fn === 'runGitFlow')
    expect(gfCall.opts.dryRun).toBe(true)
  })
})

describe('printHelp', () => {
  test('logs the help banner to stdout', () => {
    const calls = []
    const origLog = console.log
    console.log = (msg) => calls.push(msg)
    try {
      start.printHelp()
    } finally {
      console.log = origLog
    }
    expect(calls).toHaveLength(1)
    expect(calls[0]).toContain('Git Flow Start')
  })
})
