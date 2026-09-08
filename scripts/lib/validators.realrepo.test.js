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
import { spawnSync } from 'node:child_process'

// Real-repo integration: drive an actual `git init` and let validators
// exercise the real runGit/spawnSync path. No mock.module here — the
// integration under test IS the spawnSync pipeline.
const validators = await import('./validators.js')

let repoDir
let originalCwd

function git(args, opts = {}) {
  return spawnSync('git', args, {
    cwd: repoDir,
    encoding: 'utf-8',
    ...opts
  })
}

function commit(message) {
  // author/committer required for `git commit` even in a brand-new repo
  git(['config', 'user.email', 'test@example.com'])
  git(['config', 'user.name', 'Test'])
  // make HEAD point at main so test names match the ref validators query
  git(['checkout', '-b', 'main'])
  writeFileSync(join(repoDir, 'init.txt'), 'init')
  git(['add', 'init.txt'])
  return git(['commit', '-m', message])
}

beforeAll(() => {
  originalCwd = process.cwd()
  repoDir = mkdtempSync(join(tmpdir(), 'validators-realrepo-'))
  git(['init', '--initial-branch=main', '--quiet'])
  commit('initial commit')
  process.chdir(repoDir)
})

afterAll(() => {
  process.chdir(originalCwd)
  if (repoDir) rmSync(repoDir, { recursive: true, force: true })
})

afterEach(() => {
  // each test starts from a clean tree
  writeFileSync(join(repoDir, 'init.txt'), 'init')
  git(['add', '-A'])
  // re-stage to drop any leftover modifications from prior test
  writeFileSync(join(repoDir, 'init.txt'), 'init')
  git(['add', 'init.txt'])
})

// ---------------------------------------------------------------------------
// ensureCleanTree against real `git status --porcelain`
// ---------------------------------------------------------------------------

describe('ensureCleanTree (real repo)', () => {
  test('passes when working tree matches HEAD', () => {
    expect(() => validators.ensureCleanTree()).not.toThrow()
  })

  test('throws GuardError when a tracked file is modified ( M porcelain)', () => {
    writeFileSync(join(repoDir, 'init.txt'), 'dirty')
    expect(() => validators.ensureCleanTree()).toThrow(validators.GuardError)
  })

  test('throws GuardError when a tracked file is staged for addition', () => {
    writeFileSync(join(repoDir, 'new.txt'), 'fresh')
    git(['add', 'new.txt'])
    expect(() => validators.ensureCleanTree()).toThrow(validators.GuardError)
  })

  test('throws GuardError on untracked files (?? porcelain)', () => {
    writeFileSync(join(repoDir, 'untracked.txt'), 'floating')
    expect(() => validators.ensureCleanTree()).toThrow(validators.GuardError)
  })
})

// ---------------------------------------------------------------------------
// ensureBranchExists / ensureBranchMissing against real refs
// ---------------------------------------------------------------------------

describe('ensureBranchExists / ensureBranchMissing (real repo)', () => {
  test('ensureBranchExists passes for the real main branch', () => {
    expect(() => validators.ensureBranchExists('main')).not.toThrow()
  })

  test('ensureBranchExists throws for a branch that does not exist', () => {
    expect(() => validators.ensureBranchExists('does-not-exist')).toThrow(
      validators.GuardError
    )
  })

  test('ensureBranchMissing throws when the branch exists', () => {
    expect(() => validators.ensureBranchMissing('main')).toThrow(
      validators.GuardError
    )
  })

  test('ensureBranchMissing passes for an absent branch', () => {
    expect(() => validators.ensureBranchMissing('brand-new')).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// ensureTagMissing against the real tag db
// ---------------------------------------------------------------------------

describe('ensureTagMissing (real repo)', () => {
  test('passes for a version with no tag in the repo', () => {
    expect(() => validators.ensureTagMissing('9.9.9')).not.toThrow()
  })

  test('throws GuardError when the v-prefixed tag exists in the db', () => {
    git(['tag', 'v1.5.0'])
    expect(() => validators.ensureTagMissing('1.5.0')).toThrow(
      validators.GuardError
    )
    git(['tag', '-d', 'v1.5.0'])
  })

  test('accepts a v-prefixed input and detects the existing v-tag', () => {
    git(['tag', 'v2.0.0'])
    expect(() => validators.ensureTagMissing('v2.0.0')).toThrow(
      validators.GuardError
    )
    git(['tag', '-d', 'v2.0.0'])
  })
})
