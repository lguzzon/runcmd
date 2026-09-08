import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  test
} from 'bun:test'

// ---------------------------------------------------------------------------
// Stub the low-level git module BEFORE importing sync so its transitive
// dependency (../git-flow.js -> ../lib/git.js) picks up the stubs. Each
// test installs its own implementation via installRunGit.
// ---------------------------------------------------------------------------

const gitModulePath = '../lib/git.js'
let runGitImpl = () => ''

mock.module(gitModulePath, () => ({
  runGit: (args, opts = {}) => runGitImpl(args, opts),
  runGitFlow: (args, opts = {}) => runGitImpl(args, opts)
}))

// Stub installer so ensureGitFlowAvailable does not shell out to `git flow version`
mock.module('../lib/installer.js', () => ({
  ensureGitFlowAvailable: () => true
}))

// eslint-disable-next-line import/first
const sync = await import('./sync.js')

const gitCalls = []
const originalExit = process.exit

function installRunGit(fn) {
  runGitImpl = (args, opts) => {
    gitCalls.push({ args, opts })
    return fn(args, opts)
  }
}

/** Default stub: git-flow initialized, base=main exists on remote, develop
 *  branch exists locally. original=feature branch so the restore-back path
 *  triggers. Stash has changes so stashPop is invoked. */
function defaultRunGit(args) {
  if (args.startsWith('config --get gitflow.initialized')) return 'true'
  if (args.includes('ls-remote --exit-code --heads origin main')) return 'abc'
  if (args.includes('ls-remote --exit-code --heads origin master')) return null
  if (args.includes('show-ref --verify --quiet refs/heads/develop'))
    return 'abc'
  if (args.startsWith('rev-parse --abbrev-ref HEAD')) return 'feature/xyz'
  if (args.startsWith('stash push')) return 'Saved'
  return ''
}

afterAll(() => {
  process.exit = originalExit
})

beforeEach(() => {
  gitCalls.length = 0
  installRunGit(defaultRunGit)
})

afterEach(() => {
  process.exit = originalExit
})

// ---------------------------------------------------------------------------
// handleSync — orchestration paths
// ---------------------------------------------------------------------------

describe('handleSync orchestration', () => {
  test('help flag short-circuits before branch operations', async () => {
    await sync.handleSync({ help: true })
    // ensureGitFlowInitialized runs first; after that, help short-circuits
    // so no checkout/pull/push/merge calls happen.
    const branchOps = gitCalls.filter(
      (c) =>
        c.args.startsWith('checkout ') ||
        c.args.startsWith('pull ') ||
        c.args.startsWith('push ') ||
        c.args.startsWith('merge ') ||
        c.args.startsWith('stash ')
    )
    expect(branchOps).toEqual([])
  })

  test('happy path: base -> develop -> restore original, with stash pop', async () => {
    await sync.handleSync({ offline: true })

    const find = (pred) => gitCalls.find((c) => pred(c.args))
    // 1. stash push first
    expect(
      find((a) => a.startsWith('stash push -m "git-flow-sync"'))
    ).toBeDefined()
    // 2. checkout base
    expect(find((a) => a === 'checkout main')).toBeDefined()
    // 3. offline => no pull
    expect(gitCalls.some((c) => c.args.startsWith('pull'))).toBe(false)
    // 3b. pushBranch does not respect offline (current behavior) - see
    //     validators.js:57. The 2 push calls below document this.
    // 4. ensureBranchExists develop
    expect(
      find((a) => a.includes('show-ref --verify --quiet refs/heads/develop'))
    ).toBeDefined()
    // 5. checkout develop
    expect(find((a) => a === 'checkout develop')).toBeDefined()
    // 6. merge main into develop
    expect(
      find((a) => a.startsWith('merge main --no-ff --no-edit'))
    ).toBeDefined()
    // 7. original=feature/xyz, not develop, not main => restore
    expect(find((a) => a === 'checkout feature/xyz')).toBeDefined()
    // 8. stash pop at the end
    expect(find((a) => a === 'stash pop')).toBeDefined()
  })

  test('offline: pull is skipped, push still emitted (current behavior)', async () => {
    // ponytail: pushBranch does not respect `offline` (see validators.js:57).
    // Documenting the actual flow: pullBranch short-circuits on offline=true;
    // pushBranch is invoked regardless. Test pins current behavior so any
    // future fix that respects offline for push will surface here.
    installRunGit((args) => {
      if (args.startsWith('config --get gitflow.initialized')) return 'true'
      if (args.includes('ls-remote --exit-code --heads origin main'))
        return 'abc'
      if (args.includes('show-ref --verify --quiet refs/heads/develop'))
        return 'abc'
      if (args.startsWith('rev-parse --abbrev-ref HEAD')) return 'develop'
      if (args.startsWith('stash push')) return 'No local changes to save'
      return ''
    })
    await sync.handleSync({ offline: true })
    expect(gitCalls.some((c) => c.args.startsWith('pull'))).toBe(false)
    const pushes = gitCalls.filter((c) => c.args.startsWith('push origin'))
    expect(pushes.length).toBe(2) // base + develop, pushBranch ignores offline
  })

  test('online: pull and push are emitted for base and develop', async () => {
    installRunGit((args) => {
      if (args.startsWith('config --get gitflow.initialized')) return 'true'
      if (args.includes('ls-remote --exit-code --heads origin main'))
        return 'abc'
      if (args.includes('show-ref --verify --quiet refs/heads/develop'))
        return 'abc'
      if (args.startsWith('rev-parse --abbrev-ref HEAD')) return 'develop'
      if (args.startsWith('stash push')) return 'No local changes to save'
      return ''
    })
    await sync.handleSync({ offline: false })
    const pulls = gitCalls.filter((c) => c.args.startsWith('pull'))
    const pushes = gitCalls.filter((c) => c.args.startsWith('push origin'))
    expect(pulls.length).toBe(2) // base + develop
    expect(pushes.length).toBe(2) // base + develop
  })

  test('dryRun propagates to all sync sub-operations', async () => {
    await sync.handleSync({ offline: true, dryRun: true })
    // Only check the ops that handleSync directly invokes with opts:
    // checkout, pullBranch, pushBranch, mergeBranch. The internal probes
    // (config get, rev-parse, show-ref, stash push) have no dryRun to set.
    const syncOps = gitCalls.filter(
      (c) =>
        c.args.startsWith('checkout ') ||
        c.args.startsWith('pull ') ||
        c.args.startsWith('push ') ||
        c.args.startsWith('merge ')
    )
    expect(syncOps.length).toBeGreaterThan(0)
    for (const c of syncOps) {
      expect(c.opts.dryRun).toBe(true)
    }
  })

  test('original === develop: no restore-back checkout after merge', async () => {
    installRunGit((args) => {
      if (args.startsWith('config --get gitflow.initialized')) return 'true'
      if (args.includes('ls-remote --exit-code --heads origin main'))
        return 'abc'
      if (args.includes('show-ref --verify --quiet refs/heads/develop'))
        return 'abc'
      if (args.startsWith('rev-parse --abbrev-ref HEAD')) return 'develop'
      if (args.startsWith('stash push')) return 'No local changes to save'
      return ''
    })
    await sync.handleSync({ offline: true })
    const mergeIdx = gitCalls.findIndex((c) =>
      c.args.startsWith('merge main --no-ff --no-edit')
    )
    expect(mergeIdx).toBeGreaterThanOrEqual(0)
    const after = gitCalls.slice(mergeIdx + 1)
    expect(after.some((c) => c.args === 'checkout develop')).toBe(false)
  })

  test('original === base (main): no restore-back checkout after merge', async () => {
    installRunGit((args) => {
      if (args.startsWith('config --get gitflow.initialized')) return 'true'
      if (args.includes('ls-remote --exit-code --heads origin main'))
        return 'abc'
      if (args.includes('show-ref --verify --quiet refs/heads/develop'))
        return 'abc'
      if (args.startsWith('rev-parse --abbrev-ref HEAD')) return 'main'
      if (args.startsWith('stash push')) return 'No local changes to save'
      return ''
    })
    await sync.handleSync({ offline: true })
    const mergeIdx = gitCalls.findIndex((c) =>
      c.args.startsWith('merge main --no-ff --no-edit')
    )
    const after = gitCalls.slice(mergeIdx + 1)
    expect(after.some((c) => c.args === 'checkout main')).toBe(false)
  })

  test('stash output containing "No local changes" skips stashPop', async () => {
    installRunGit((args) => {
      if (args.startsWith('config --get gitflow.initialized')) return 'true'
      if (args.includes('ls-remote --exit-code --heads origin main'))
        return 'abc'
      if (args.includes('show-ref --verify --quiet refs/heads/develop'))
        return 'abc'
      if (args.startsWith('rev-parse --abbrev-ref HEAD')) return 'feature/xyz'
      if (args.startsWith('stash push')) return 'No local changes to save'
      return ''
    })
    await sync.handleSync({ offline: true })
    expect(gitCalls.some((c) => c.args === 'stash pop')).toBe(false)
  })

  test('stash with real changes triggers stashPop', async () => {
    await sync.handleSync({ offline: true })
    expect(gitCalls.some((c) => c.args === 'stash pop')).toBe(true)
  })

  test('detectMainBranch picks master when main missing on origin', async () => {
    installRunGit((args) => {
      if (args.startsWith('config --get gitflow.initialized')) return 'true'
      if (args.includes('ls-remote --exit-code --heads origin main'))
        return null
      if (args.includes('ls-remote --exit-code --heads origin master'))
        return 'abc'
      if (args.includes('show-ref --verify --quiet refs/heads/develop'))
        return 'abc'
      if (args.startsWith('rev-parse --abbrev-ref HEAD')) return 'feature/xyz'
      if (args.startsWith('stash push')) return 'No local changes to save'
      return ''
    })
    await sync.handleSync({ offline: true })
    expect(gitCalls.some((c) => c.args === 'checkout master')).toBe(true)
    expect(
      gitCalls.some((c) => c.args.startsWith('merge master --no-ff --no-edit'))
    ).toBe(true)
  })

  test('stashPush failure produces empty stash string without breaking flow', async () => {
    installRunGit((args) => {
      if (args.startsWith('config --get gitflow.initialized')) return 'true'
      if (args.includes('ls-remote --exit-code --heads origin main'))
        return 'abc'
      if (args.includes('show-ref --verify --quiet refs/heads/develop'))
        return 'abc'
      if (args.startsWith('rev-parse --abbrev-ref HEAD')) return 'feature/xyz'
      if (args.startsWith('stash push')) return null
      return ''
    })
    await sync.handleSync({ offline: true })
    // Empty stash => no stash pop called
    expect(gitCalls.some((c) => c.args === 'stash pop')).toBe(false)
    // Restore still happens
    expect(gitCalls.some((c) => c.args === 'checkout feature/xyz')).toBe(true)
  })
})
