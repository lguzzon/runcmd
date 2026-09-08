import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  spyOn,
  test
} from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as childProcess from 'node:child_process'

// Real-spawn integration: drive actual `git` and `git flow` invocations
// through runGit / runGitFlow. No mocks — the integration under test IS
// the spawnSync pipeline. This is the file the [medium] finding flagged:
// untested dryRun, allowFail, and process.exit branches.
const git = await import('./git.js')

let repoDir
let originalCwd
let originalExit

function commit(message) {
  // author/committer required for `git commit` even in a brand-new repo
  // use the module under test (runGit) — but cwd is whatever process.chdir
  // pointed at; setup() below sets cwd to repoDir before calling commit()
  git.runGit(['config', 'user.email', 'test@example.com'])
  git.runGit(['config', 'user.name', 'Test'])
  git.runGit(['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(repoDir, 'init.txt'), 'init')
  git.runGit(['add', 'init.txt'])
  return git.runGit(['commit', '-m', message])
}

function initRepo() {
  repoDir = mkdtempSync(join(tmpdir(), 'git-realrepo-'))
  process.chdir(repoDir)
  git.runGit(['init', '--initial-branch=main', '--quiet'])
  commit('initial commit')
}

beforeAll(() => {
  originalCwd = process.cwd()
  originalExit = process.exit
  initRepo()
})

afterAll(() => {
  process.chdir(originalCwd)
  process.exit = originalExit
  if (repoDir) rmSync(repoDir, { recursive: true, force: true })
})

afterEach(() => {
  // Reset process.exit between tests so a thrown exit from one test does
  // not leak into the next.
  process.exit = originalExit
})

// ---------------------------------------------------------------------------
// runGit — happy path against a real repo
// ---------------------------------------------------------------------------

describe('runGit (real spawn)', () => {
  test('returns trimmed stdout for rev-parse against a real repo', () => {
    const branch = git.runGit('rev-parse --abbrev-ref HEAD')
    expect(branch).toBe('main')
  })

  test('accepts an args array (not just a string)', () => {
    const out = git.runGit(['rev-parse', '--abbrev-ref', 'HEAD'])
    expect(out).toBe('main')
  })

  test('returns an empty trimmed string for porcelain on a clean tree', () => {
    const out = git.runGit('status --porcelain')
    expect(out).toBe('')
  })
})

// ---------------------------------------------------------------------------
// runGit — dryRun short-circuits before spawn
// ---------------------------------------------------------------------------

describe('runGit dryRun', () => {
  test('returns "" without spawning when dryRun=true', () => {
    const spawnSpy = spyOn(childProcess, 'spawnSync')
    const out = git.runGit('rev-parse --abbrev-ref HEAD', { dryRun: true })
    expect(out).toBe('')
    expect(spawnSpy).not.toHaveBeenCalled()
    spawnSpy.mockRestore()
  })

  test('logs the would-be command under dryRun', () => {
    const logSpy = spyOn(console, 'log').mockImplementation(() => {})
    git.runGit(['status', '--porcelain'], { dryRun: true })
    const messages = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
    expect(messages).toContain('[dry-run]')
    expect(messages).toContain('git status --porcelain')
    logSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// runGit — allowFail swallows the exit and returns null
// ---------------------------------------------------------------------------

describe('runGit allowFail', () => {
  test('returns null on non-zero exit when allowFail=true', () => {
    // rev-parse against a ref that does not exist exits non-zero
    const out = git.runGit('rev-parse does-not-exist', { allowFail: true })
    expect(out).toBeNull()
  })

  test('does NOT call process.exit when allowFail=true and the command fails', () => {
    const errSpy = spyOn(console, 'error').mockImplementation(() => {})
    let exitCalled = false
    process.exit = () => {
      exitCalled = true
    }
    const out = git.runGit('rev-parse does-not-exist', { allowFail: true })
    expect(out).toBeNull()
    expect(exitCalled).toBe(false)
    errSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// runGit — fatal path: process.exit(1) on failure
// ---------------------------------------------------------------------------

describe('runGit fatal failure', () => {
  test('calls process.exit(1) when allowFail=false and the command fails', () => {
    const errSpy = spyOn(console, 'error').mockImplementation(() => {})
    let exitCode = null
    process.exit = (code) => {
      exitCode = code
    }
    git.runGit('rev-parse does-not-exist')
    expect(exitCode).toBe(1)
    errSpy.mockRestore()
  })

  test('writes the failing command and stderr to stderr', () => {
    const errSpy = spyOn(console, 'error').mockImplementation(() => {})
    let exitCode = null
    process.exit = (code) => {
      exitCode = code
    }
    git.runGit('rev-parse does-not-exist')
    const stderrLines = errSpy.mock.calls.map((c) => c.join(' ')).join('\n')
    expect(stderrLines).toContain('failed')
    expect(exitCode).toBe(1)
    errSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// runGit — pipeStdout inherits stdio
// ---------------------------------------------------------------------------

describe('runGit pipeStdout', () => {
  test('runs without error when pipeStdout=true (stdout is inherited)', () => {
    // When stdio is 'inherit', result.stdout is null and the function
    // returns ''. We just need to assert the call completes without
    // exiting or throwing.
    const errSpy = spyOn(console, 'error').mockImplementation(() => {})
    let exitCalled = false
    process.exit = () => {
      exitCalled = true
    }
    const branch = git.runGit('rev-parse --abbrev-ref HEAD', {
      pipeStdout: true
    })
    expect(branch).toBe('')
    expect(exitCalled).toBe(false)
    errSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// runGitFlow — same surface, prefixed `git flow`
// ---------------------------------------------------------------------------

describe('runGitFlow (real spawn)', () => {
  test('dryRun=true returns "" and does not spawn', () => {
    const spawnSpy = spyOn(childProcess, 'spawnSync')
    const out = git.runGitFlow('version', { dryRun: true })
    expect(out).toBe('')
    expect(spawnSpy).not.toHaveBeenCalled()
    spawnSpy.mockRestore()
  })

  test('dryRun=true logs the prefixed command', () => {
    const logSpy = spyOn(console, 'log').mockImplementation(() => {})
    git.runGitFlow(['init', '-d'], { dryRun: true })
    const messages = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
    expect(messages).toContain('git flow init -d')
    logSpy.mockRestore()
  })

  test('allowFail=true returns null when the underlying git flow subcommand fails', () => {
    // `git flow` rejects unknown subcommands with a non-zero exit
    const out = git.runGitFlow('this-subcommand-does-not-exist', {
      allowFail: true
    })
    expect(out).toBeNull()
  })

  test('fatal: calls process.exit(1) on failure when allowFail=false', () => {
    const errSpy = spyOn(console, 'error').mockImplementation(() => {})
    let exitCode = null
    process.exit = (code) => {
      exitCode = code
    }
    git.runGitFlow('this-subcommand-does-not-exist')
    expect(exitCode).toBe(1)
    errSpy.mockRestore()
  })

  test('returns trimmed stdout for a real git flow command (version)', () => {
    const out = git.runGitFlow('version')
    // git-flow-next prints "X.Y.Z (git-flow-next)"; we just want a non-empty trim
    expect(out.length).toBeGreaterThan(0)
    expect(out).toBe(out.trim())
  })
})
