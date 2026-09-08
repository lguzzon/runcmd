import { afterEach, describe, expect, mock, test } from 'bun:test'

// Mock the git module BEFORE importing validators so the static binding picks
// up the stub. Each test installs its own implementation via installRunGit.
const gitModulePath = './git.js'
let runGitImpl = () => ''

mock.module(gitModulePath, () => {
  const splitArgs = (s) => {
    const out = []
    let cur = ''
    let inQ = false
    let esc = false
    for (const c of s) {
      if (esc) {
        cur += c
        esc = false
        continue
      }
      if (c === '\\') {
        esc = true
        continue
      }
      if (c === '"') {
        inQ = !inQ
        continue
      }
      if (c === ' ' && !inQ) {
        if (cur) {
          out.push(cur)
          cur = ''
        }
        continue
      }
      cur += c
    }
    if (cur) out.push(cur)
    return out
  }
  return {
    splitArgs,
    runGit: (args, opts = {}) => runGitImpl(args, opts),
    runGitFlow: (args, opts = {}) => runGitImpl(args, opts)
  }
})

// eslint-disable-next-line import/first
const validators = await import('./validators.js')

function installRunGit(fn) {
  runGitImpl = fn
}

afterEach(() => {
  // Reset to a no-op default between tests.
  runGitImpl = () => ''
})

// ---------------------------------------------------------------------------
// ensureCleanTree
// ---------------------------------------------------------------------------

describe('ensureCleanTree', () => {
  test('does not throw when porcelain status is empty', () => {
    installRunGit(() => '')
    expect(() => validators.ensureCleanTree()).not.toThrow()
  })

  test('throws GuardError when porcelain status reports changes', () => {
    installRunGit(() => ' M scripts/lib/validators.js')
    expect(() => validators.ensureCleanTree()).toThrow(validators.GuardError)
  })
})

// ---------------------------------------------------------------------------
// ensureBranchExists
// ---------------------------------------------------------------------------

describe('ensureBranchExists', () => {
  test('does not throw when show-ref finds the branch', () => {
    installRunGit((args) =>
      args.includes('show-ref') ? 'abc refs/heads/main' : ''
    )
    expect(() => validators.ensureBranchExists('main')).not.toThrow()
  })

  test('throws GuardError when show-ref returns null (branch missing)', () => {
    installRunGit(() => null)
    expect(() => validators.ensureBranchExists('missing')).toThrow(
      validators.GuardError
    )
  })
})

// ---------------------------------------------------------------------------
// ensureBranchMissing
// ---------------------------------------------------------------------------

describe('ensureBranchMissing', () => {
  test('does not throw when show-ref returns null (branch absent)', () => {
    installRunGit(() => null)
    expect(() => validators.ensureBranchMissing('brand-new')).not.toThrow()
  })

  test('throws GuardError when show-ref finds the branch', () => {
    installRunGit((args) =>
      args.includes('show-ref') ? 'abc refs/heads/dupe' : ''
    )
    expect(() => validators.ensureBranchMissing('dupe')).toThrow(
      validators.GuardError
    )
  })
})

// ---------------------------------------------------------------------------
// ensureTagMissing
// ---------------------------------------------------------------------------

describe('ensureTagMissing', () => {
  test('does not throw when tag list does not contain the version', () => {
    installRunGit(() => 'v1.0.0\nv1.1.0\n')
    expect(() => validators.ensureTagMissing('1.2.0')).not.toThrow()
  })

  test('throws GuardError when the v-prefixed tag already exists', () => {
    installRunGit(() => 'v1.0.0\nv1.2.0\n')
    expect(() => validators.ensureTagMissing('1.2.0')).toThrow(
      validators.GuardError
    )
  })

  test('accepts a v-prefixed input and still detects existing v-tag', () => {
    installRunGit(() => 'v2.0.0\n')
    expect(() => validators.ensureTagMissing('v2.0.0')).toThrow(
      validators.GuardError
    )
  })

  test('treats empty tag list as "no tags" (no throw)', () => {
    installRunGit(() => '')
    expect(() => validators.ensureTagMissing('1.2.3')).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// ensureGitFlowInitialized
// ---------------------------------------------------------------------------

describe('ensureGitFlowInitialized', () => {
  test('does not throw when gitflow.initialized is set to true', () => {
    installRunGit(() => 'true')
    expect(() => validators.ensureGitFlowInitialized()).not.toThrow()
  })

  test('throws GuardError when gitflow.initialized is missing (null)', () => {
    installRunGit(() => null)
    expect(() => validators.ensureGitFlowInitialized()).toThrow(
      validators.GuardError
    )
  })

  test('throws GuardError when gitflow.initialized is empty string', () => {
    installRunGit(() => '')
    expect(() => validators.ensureGitFlowInitialized()).toThrow(
      validators.GuardError
    )
  })
})

// ---------------------------------------------------------------------------
// currentBranch
// ---------------------------------------------------------------------------

describe('currentBranch', () => {
  test('returns trimmed branch name from rev-parse', () => {
    installRunGit(() => 'feature/login')
    expect(validators.currentBranch()).toBe('feature/login')
  })

  test('returns empty string when rev-parse fails (detached / no repo)', () => {
    installRunGit(() => null)
    expect(validators.currentBranch()).toBe('')
  })
})

// ---------------------------------------------------------------------------
// detectMainBranch
// ---------------------------------------------------------------------------

describe('detectMainBranch', () => {
  // ls-remote with --exit-code returns non-zero (and thus null from runGit)
  // when the ref is absent. We model that with explicit null returns.
  test('returns "main" when origin has a main branch', () => {
    installRunGit((args) =>
      args.includes('main') ? 'abc refs/heads/main' : null
    )
    expect(validators.detectMainBranch('origin')).toBe('main')
  })

  test('falls back to "master" when main is absent', () => {
    installRunGit((args) =>
      args.includes('master') ? 'abc refs/heads/master' : null
    )
    expect(validators.detectMainBranch('origin')).toBe('master')
  })

  test('defaults to "main" when neither main nor master exists', () => {
    installRunGit(() => null)
    expect(validators.detectMainBranch('origin')).toBe('main')
  })
})

// ---------------------------------------------------------------------------
// getGitFlowConfig
// ---------------------------------------------------------------------------

describe('getGitFlowConfig', () => {
  test('returns hard-coded defaults when every config key is missing', () => {
    installRunGit(() => null)
    expect(validators.getGitFlowConfig()).toEqual({
      master: 'master',
      develop: 'develop',
      featurePrefix: 'feature/',
      releasePrefix: 'release/',
      hotfixPrefix: 'hotfix/',
      supportPrefix: 'support/'
    })
  })

  test('mixes real config values with defaults for missing keys', () => {
    installRunGit((args) => {
      if (args.includes('--get-regexp')) {
        return 'gitflow.branch.master main\ngitflow.prefix.feature feat/'
      }
      return null
    })
    expect(validators.getGitFlowConfig()).toEqual({
      master: 'main',
      develop: 'develop',
      featurePrefix: 'feat/',
      releasePrefix: 'release/',
      hotfixPrefix: 'hotfix/',
      supportPrefix: 'support/'
    })
  })
})

// ---------------------------------------------------------------------------
// listBranchesByType
// ---------------------------------------------------------------------------

describe('listBranchesByType', () => {
  test('strips "*" markers and returns trimmed branch names', () => {
    installRunGit(() => '  feature/login\n* feature/signup\nfeature/cart\n')
    const out = validators.listBranchesByType('feature')
    expect(out).toEqual(['feature/login', 'feature/signup', 'feature/cart'])
  })

  test('returns empty array when no branches match the prefix', () => {
    installRunGit(() => '')
    expect(validators.listBranchesByType('feature')).toEqual([])
  })

  test('returns empty array for an unknown type (no prefix configured)', () => {
    installRunGit(() => '')
    const out = validators.listBranchesByType('bogus')
    expect(out).toEqual([])
  })

  test('reads the full git-flow config in a single spawn (no per-key forks)', () => {
    const configCalls = []
    installRunGit((args) => {
      if (args.includes('config --get-regexp')) configCalls.push(args)
      return ''
    })
    validators.listBranchesByType('feature')
    expect(configCalls).toHaveLength(1)
  })

  test('queries git with the configured prefix', () => {
    const calls = []
    installRunGit((args) => {
      calls.push(args)
      return ''
    })
    validators.listBranchesByType('release')
    // The release-prefix lookup happens via getGitFlowConfig, which asks git
    // for each config key; the actual branch list is the LAST call of the
    // form "branch --list <prefix>*"
    const branchList = calls.find((a) => a.startsWith('branch --list'))
    expect(branchList).toBeDefined()
    expect(branchList).toContain('release/')
  })
})

// ---------------------------------------------------------------------------
// checkout / pushBranch / stashPush / stashPop / mergeBranch / pullBranch
// (thin wrappers — assert they delegate args+opts to runGit)
// ---------------------------------------------------------------------------

describe('git wrapper delegation', () => {
  test('checkout forwards branch and opts to runGit', () => {
    let captured = null
    installRunGit((args, opts) => {
      captured = { args, opts }
      return ''
    })
    validators.checkout('develop', { dryRun: true })
    expect(captured.args).toBe('checkout develop')
    expect(captured.opts.dryRun).toBe(true)
  })

  test('pushBranch always sets allowFail=true and prefixes origin', () => {
    let captured = null
    installRunGit((args, opts) => {
      captured = { args, opts }
      return 'pushed'
    })
    expect(validators.pushBranch('feature/x')).toBe('pushed')
    expect(captured.args).toBe('push origin feature/x')
    expect(captured.opts.allowFail).toBe(true)
  })

  test('stashPush passes the supplied message', () => {
    let captured = null
    installRunGit((args, opts) => {
      captured = { args, opts }
      return ''
    })
    validators.stashPush('wip before sync')
    expect(captured.args).toBe('stash push -m "wip before sync"')
    expect(captured.opts.allowFail).toBe(true)
  })

  test('stashPop uses allowFail=true and bare stash pop', () => {
    let captured = null
    installRunGit((args, opts) => {
      captured = { args, opts }
      return ''
    })
    validators.stashPop()
    expect(captured.args).toBe('stash pop')
    expect(captured.opts.allowFail).toBe(true)
  })

  test('pullBranch short-circuits when offline=true', () => {
    let called = false
    installRunGit(() => {
      called = true
      return ''
    })
    validators.pullBranch('develop', { offline: true })
    expect(called).toBe(false)
  })

  test('pullBranch does not short-circuit when offline=false (default)', () => {
    let calls = 0
    installRunGit(() => {
      calls++
      return ''
    })
    validators.pullBranch('develop')
    expect(calls).toBe(2) // checkout + pull
  })

  test('mergeBranch throws GuardError when merge fails on a non-dry-run', () => {
    installRunGit(() => null)
    expect(() => validators.mergeBranch('feature/x', 'develop')).toThrow(
      validators.GuardError
    )
  })

  test('mergeBranch does NOT throw on failure when dryRun=true', () => {
    installRunGit(() => null)
    expect(() =>
      validators.mergeBranch('feature/x', 'develop', { dryRun: true })
    ).not.toThrow()
  })
})
