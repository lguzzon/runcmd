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
let tagMissingCalls = []
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
  ensureTagMissing(tag) {
    tagMissingCalls.push(tag)
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
  }
}))

let finish

beforeAll(async () => {
  finish = await import('./finish.js')
})

afterEach(() => {
  gitCalls = []
  requireValidResult = true
  requireValidSeen = null
  cleanTreeCalls = 0
  branchExistsCalls = []
  tagMissingCalls = []
  pullBranchCalls = []
  exit = 0
})

const safeHandle = async (opts) => {
  try {
    await finish.handleFinish(opts)
  } catch (e) {
    if (!String(e.message).startsWith('__EXIT__')) throw e
  }
}

describe('handleFinish — requireValidCommand gate', () => {
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
    expect(requireValidSeen.cfg.commandName).toBe('finish')
    expect(requireValidSeen.cfg.helpFn).toBe(finish.printHelp)
  })
})

describe('handleFinish — required args', () => {
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

describe('handleFinish — release/hotfix require --tag and --message', () => {
  test('exits when release is missing --tag', async () => {
    await safeHandle({ type: 'release', name: 'v1.2.0', message: 'msg' })
    expect(exit).toBe(1)
    expect(gitCalls.filter((c) => c.fn === 'runGitFlow')).toHaveLength(0)
  })

  test('exits when release is missing --message', async () => {
    await safeHandle({ type: 'release', name: 'v1.2.0', tag: 'v1.2.0' })
    expect(exit).toBe(1)
    expect(gitCalls.filter((c) => c.fn === 'runGitFlow')).toHaveLength(0)
  })

  test('exits when hotfix is missing --tag and --message', async () => {
    await safeHandle({ type: 'hotfix', name: 'v1.1.1' })
    expect(exit).toBe(1)
    expect(gitCalls.filter((c) => c.fn === 'runGitFlow')).toHaveLength(0)
  })

  test('feature does not require --tag/--message', async () => {
    await safeHandle({ type: 'feature', name: 'new-auth' })
    expect(exit).toBe(0)
    expect(gitCalls.filter((c) => c.fn === 'runGitFlow')).toHaveLength(1)
  })
})

describe('handleFinish — ensureTagMissing', () => {
  test('checks tag presence when --tag is provided', async () => {
    await safeHandle({
      type: 'release',
      name: 'v1.2.0',
      tag: 'v1.2.0',
      message: 'msg'
    })
    expect(tagMissingCalls).toEqual(['v1.2.0'])
  })

  test('skips ensureTagMissing when --tag absent', async () => {
    await safeHandle({ type: 'feature', name: 'new-auth' })
    expect(tagMissingCalls).toHaveLength(0)
  })
})

describe('handleFinish — offline behaviour', () => {
  test('offline skips pullBranch calls', async () => {
    await safeHandle({
      type: 'feature',
      name: 'x',
      offline: true
    })
    expect(pullBranchCalls).toHaveLength(0)
  })

  test('offline skips the base branch pull for release', async () => {
    await safeHandle({
      type: 'release',
      name: 'v1.2.0',
      tag: 'v1.2.0',
      message: 'msg',
      offline: true
    })
    expect(pullBranchCalls).toHaveLength(0)
  })

  test('online pulls feature branch then develop', async () => {
    await safeHandle({ type: 'feature', name: 'x' })
    expect(pullBranchCalls).toHaveLength(2)
    expect(pullBranchCalls[0].name).toBe('feature/x')
    expect(pullBranchCalls[1].name).toBe('develop')
  })

  test('online pulls hotfix branch then main', async () => {
    await safeHandle({
      type: 'hotfix',
      name: 'v1.1.1',
      tag: 'v1.1.1',
      message: 'msg'
    })
    expect(pullBranchCalls[1].name).toBe('main')
  })

  test('online pulls support branch then main', async () => {
    await safeHandle({ type: 'support', name: 'v1-0-x' })
    expect(pullBranchCalls[1].name).toBe('main')
  })

  test('offline does NOT call ensureBranchExists on base', async () => {
    await safeHandle({ type: 'feature', name: 'x', offline: true })
    expect(branchExistsCalls).toEqual(['feature/x'])
  })

  test('online calls ensureBranchExists for both branch and base', async () => {
    await safeHandle({ type: 'feature', name: 'x' })
    expect(branchExistsCalls).toEqual(['feature/x', 'develop'])
  })
})

describe('handleFinish — flag construction (release/hotfix)', () => {
  test('release with --push builds "<type> finish -p -T vX.Y.Z -m "msg" <name>"', async () => {
    await safeHandle({
      type: 'release',
      name: 'v1.2.0',
      tag: 'v1.2.0',
      message: 'Release 1.2.0',
      push: true
    })
    const gf = gitCalls.find((c) => c.fn === 'runGitFlow')
    expect(gf.args).toBe(
      'release finish -p -T v1.2.0 -m "Release 1.2.0" v1.2.0'
    )
  })

  test('hotfix with --squash and --message but no push', async () => {
    await safeHandle({
      type: 'hotfix',
      name: 'v1.1.1',
      tag: 'v1.1.1',
      message: 'Hotfix 1.1.1',
      squash: true
    })
    const gf = gitCalls.find((c) => c.fn === 'runGitFlow')
    expect(gf.args).toBe(
      'hotfix finish --squash -T v1.1.1 -m "Hotfix 1.1.1" v1.1.1'
    )
  })

  test('release with all flags', async () => {
    await safeHandle({
      type: 'release',
      name: 'v1.2.0',
      tag: 'v1.2.0',
      message: 'msg',
      push: true,
      squash: true
    })
    const gf = gitCalls.find((c) => c.fn === 'runGitFlow')
    expect(gf.args).toBe('release finish -p --squash -T v1.2.0 -m "msg" v1.2.0')
  })
})

describe('handleFinish — feature has no -T/-m flags', () => {
  test('feature build only adds -p when --push', async () => {
    await safeHandle({ type: 'feature', name: 'new-auth', push: true })
    const gf = gitCalls.find((c) => c.fn === 'runGitFlow')
    expect(gf.args).toBe('feature finish -p new-auth')
  })

  test('feature with --squash only', async () => {
    await safeHandle({ type: 'feature', name: 'new-auth', squash: true })
    const gf = gitCalls.find((c) => c.fn === 'runGitFlow')
    expect(gf.args).toBe('feature finish --squash new-auth')
  })

  test('feature with no flags builds "<type> finish <name>"', async () => {
    await safeHandle({ type: 'feature', name: 'new-auth' })
    const gf = gitCalls.find((c) => c.fn === 'runGitFlow')
    expect(gf.args).toBe('feature finish new-auth')
  })
})

describe('handleFinish — --push and --offline interaction', () => {
  test('push+online emits -p flag in git-flow finish', async () => {
    await safeHandle({ type: 'feature', name: 'x', push: true })
    const gf = gitCalls.find((c) => c.fn === 'runGitFlow')
    expect(gf.args).toContain('-p')
  })

  test('push+offline does NOT emit -p in git-flow finish', async () => {
    await safeHandle({
      type: 'feature',
      name: 'x',
      push: true,
      offline: true
    })
    const gf = gitCalls.find((c) => c.fn === 'runGitFlow')
    expect(gf.args).not.toContain(' -p')
  })

  test('push+offline still runs git-flow finish (only push skipped)', async () => {
    await safeHandle({
      type: 'feature',
      name: 'x',
      push: true,
      offline: true
    })
    expect(gitCalls.filter((c) => c.fn === 'runGitFlow')).toHaveLength(1)
  })
})

describe('handleFinish — branch deletion', () => {
  test('default behaviour: deletes branch with -d (allowFail)', async () => {
    await safeHandle({ type: 'feature', name: 'new-auth' })
    const del = gitCalls.find(
      (c) => c.fn === 'runGit' && c.args.startsWith('branch ')
    )
    expect(del).toBeDefined()
    expect(del.args).toBe('branch -d feature/new-auth')
    expect(del.opts.allowFail).toBe(true)
  })

  test('--force: deletes branch with -D', async () => {
    await safeHandle({ type: 'feature', name: 'new-auth', force: true })
    const del = gitCalls.find(
      (c) => c.fn === 'runGit' && c.args.startsWith('branch ')
    )
    expect(del.args).toBe('branch -D feature/new-auth')
  })

  test('--keep-branch: skips deletion entirely', async () => {
    await safeHandle({ type: 'feature', name: 'new-auth', keepBranch: true })
    const del = gitCalls.find(
      (c) => c.fn === 'runGit' && c.args.startsWith('branch ')
    )
    expect(del).toBeUndefined()
  })

  test('--dry-run: skips branch deletion', async () => {
    await safeHandle({ type: 'feature', name: 'new-auth', dryRun: true })
    const del = gitCalls.find(
      (c) => c.fn === 'runGit' && c.args.startsWith('branch ')
    )
    expect(del).toBeUndefined()
  })

  test('keepBranch + dryRun: no delete, no force', async () => {
    await safeHandle({
      type: 'feature',
      name: 'new-auth',
      keepBranch: true,
      dryRun: true,
      force: true
    })
    const del = gitCalls.find(
      (c) => c.fn === 'runGit' && c.args.startsWith('branch ')
    )
    expect(del).toBeUndefined()
  })
})

describe('handleFinish — git-flow command passes dryRun', () => {
  test('dryRun=true forwarded to runGitFlow', async () => {
    await safeHandle({ type: 'feature', name: 'x', dryRun: true })
    const gf = gitCalls.find((c) => c.fn === 'runGitFlow')
    expect(gf.opts.dryRun).toBe(true)
  })
})

describe('printHelp', () => {
  test('logs the help banner to stdout', () => {
    const calls = []
    const origLog = console.log
    console.log = (msg) => calls.push(msg)
    try {
      finish.printHelp()
    } finally {
      console.log = origLog
    }
    expect(calls).toHaveLength(1)
    expect(calls[0]).toContain('Git Flow Finish')
  })
})
