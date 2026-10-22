import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test
} from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Real-repo integration for handleSync: drive an actual merge conflict in a
// temp repo and assert the finally-block restore semantics (original branch
// re-checked-out, the exact pushed stash popped, conflicted tree cleaned).
// Modeled after scripts/lib/git.realrepo.test.js.

let repoDir
let originalCwd
let originalExit

const sync = await import('./sync.js')

/** Run a raw git command in the fixture repo (bypasses runGit module). */
function sh(args) {
  const out = Bun.spawnSync(['git', ...args.split(' ')], {
    cwd: repoDir,
    stdout: 'pipe',
    stderr: 'pipe'
  })
  return {
    ok: out.exitCode === 0,
    stdout: out.stdout.toString().trim(),
    stderr: out.stderr.toString().trim()
  }
}

function commitAll(message) {
  sh('config user.email test@example.com')
  sh('config user.name Test')
  writeFileSync(join(repoDir, 'file.txt'), message)
  sh('add file.txt')
  return sh(`commit -m ${message}`)
}

beforeAll(() => {
  originalCwd = process.cwd()
  originalExit = process.exit
  repoDir = mkdtempSync(join(tmpdir(), 'sync-realrepo-'))
  process.chdir(repoDir)
  sh('init --initial-branch=main --quiet')
  commitAll('base')
  // git-flow-next stores its config under gitflow.*; init -d writes defaults
  sh('config gitflow.initialized true')
  // develop diverges from main on file.txt
  sh('checkout -b develop')
  commitAll('develop-change')
  // main diverges too — merging main into develop conflicts
  sh('checkout main')
  commitAll('main-change')
  // start on a feature branch so the restore path is exercised
  sh('checkout -b feature/work develop')
})

afterAll(() => {
  process.chdir(originalCwd)
  process.exit = originalExit
  if (repoDir) rmSync(repoDir, { recursive: true, force: true })
})

afterEach(() => {
  process.exit = originalExit
})

describe('handleSync (real repo)', () => {
  test('merge conflict: restores original branch, pops the pushed stash, and cleans the conflict', async () => {
    // Uncommitted tracked change on feature/work -> handleSync stashes it.
    writeFileSync(join(repoDir, 'file.txt'), 'wip on feature')
    const branchBefore = sh('rev-parse --abbrev-ref HEAD').stdout
    expect(branchBefore).toBe('feature/work')

    // The sync's merge of main into develop conflicts (both edited file.txt).
    let threw = null
    try {
      await sync.handleSync({ offline: true })
    } catch (e) {
      threw = e
    }
    expect(threw).not.toBeNull()
    expect(String(threw.message)).toContain('Merge of main into develop failed')

    // 1. Original checkout restored.
    expect(sh('rev-parse --abbrev-ref HEAD').stdout).toBe('feature/work')

    // 2. No conflicted files left behind.
    expect(sh('status --porcelain').stdout).not.toContain('UU')

    // 3. Stash popped: the wip change is back in the working tree and the
    //    stash list is empty.
    expect(sh('stash list').stdout).toBe('')
    expect(sh('status --porcelain').stdout).toContain('M file.txt')
    expect(
      Bun.spawnSync(['cat', join(repoDir, 'file.txt')], {
        stdout: 'pipe'
      }).stdout.toString()
    ).toBe('wip on feature')
  })

  test('pops only the stash created by the sync; a pre-existing stash survives', async () => {
    // Clean slate from the previous test's leftovers.
    sh('checkout -- file.txt')
    sh('reset --hard')
    // A stash created before the sync (as another tool might).
    writeFileSync(join(repoDir, 'other.txt'), 'pre-existing stash')
    sh('add other.txt')
    sh('stash push -m pre-existing')
    expect(sh('stash list').stdout).toContain('pre-existing')

    // The sync stashes its own wip and then conflicts as before.
    writeFileSync(join(repoDir, 'file.txt'), 'sync wip')
    try {
      await sync.handleSync({ offline: true })
    } catch {
      // expected merge failure
    }

    // Restore semantics hold...
    expect(sh('rev-parse --abbrev-ref HEAD').stdout).toBe('feature/work')
    expect(sh('status --porcelain').stdout).not.toContain('UU')
    // ...the sync's own stash was popped back...
    expect(sh('stash list').stdout).not.toContain('git-flow-sync')
    // ...and the unrelated pre-existing stash was NOT consumed.
    expect(sh('stash list').stdout).toContain('pre-existing')
    sh('stash drop')
  })
})
