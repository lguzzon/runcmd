import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test
} from 'bun:test'

// ---------------------------------------------------------------------------
// Mock the low-level git module BEFORE importing release-finalize so its
// transitive dependency (./git-flow.js -> ./lib/git.js) picks up the stub.
// Each test installs its own implementation via installRunGit.
// ---------------------------------------------------------------------------

const gitModulePath = './lib/git.js'
let runGitImpl = () => ''

mock.module(gitModulePath, () => ({
  runGit: (args, opts = {}) => runGitImpl(args, opts),
  runGitFlow: (args, opts = {}) => runGitImpl(args, opts)
}))

// eslint-disable-next-line import/first
const prompts = await import('./lib/prompts.js')
// eslint-disable-next-line import/first
const rf = await import('./release-finalize.js')

const gitCalls = []
const originalExit = process.exit
const originalCI = process.env.CI

function throwOnExit() {
  process.exit = (code) => {
    throw new Error(`process.exit(${code})`)
  }
}

function installRunGit(fn) {
  runGitImpl = (args, opts) => {
    gitCalls.push({ args, opts })
    return fn(args, opts)
  }
}

beforeEach(() => {
  gitCalls.length = 0
  // Ensure CI is not set unless a test installs it explicitly.
  delete process.env.CI
})

afterEach(() => {
  process.exit = originalExit
  if (originalCI === undefined) delete process.env.CI
  else process.env.CI = originalCI
})

beforeAll(() => {
  // Capture the default-import reset to keep tests isolated.
})

afterAll(() => {
  // No-op: state restoration handled in afterEach.
})

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------

describe('parseArgs', () => {
  test('returns defaults for empty argv', () => {
    const opts = rf.parseArgs([])
    expect(opts).toEqual({
      type: undefined,
      branch: undefined,
      push: false,
      dryRun: false,
      yes: false,
      noChangelog: false,
      keepBranch: false,
      json: false,
      offline: false,
      help: false
    })
  })

  test('parses every supported flag', () => {
    const opts = rf.parseArgs([
      '--type',
      'release',
      '--branch',
      'release/v1.2.0',
      '--push',
      '--dry-run',
      '--yes',
      '--no-changelog',
      '--keep-branch',
      '--json',
      '--offline',
      '--help'
    ])
    expect(opts).toEqual({
      type: 'release',
      branch: 'release/v1.2.0',
      push: true,
      dryRun: true,
      yes: true,
      noChangelog: true,
      keepBranch: true,
      json: true,
      offline: true,
      help: true
    })
  })

  test('-h is equivalent to --help', () => {
    expect(rf.parseArgs(['-h']).help).toBe(true)
    expect(rf.parseArgs(['--help']).help).toBe(true)
  })

  test('unknown arguments are ignored (backward compatibility)', () => {
    const opts = rf.parseArgs(['--unknown-flag', 'release/v1.0.0', '--junk'])
    expect(opts.branch).toBeUndefined()
    expect(opts).not.toHaveProperty('unknown-flag')
  })

  test('CI=true forces opts.yes=true even without --yes', () => {
    process.env.CI = 'true'
    const opts = rf.parseArgs(['--push'])
    expect(opts.yes).toBe(true)
  })

  test('CI=true preserves --yes=true (idempotent)', () => {
    process.env.CI = 'true'
    const opts = rf.parseArgs(['--yes'])
    expect(opts.yes).toBe(true)
  })

  test('CI unset leaves opts.yes=false by default', () => {
    delete process.env.CI
    const opts = rf.parseArgs([])
    expect(opts.yes).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// detectBranch
// ---------------------------------------------------------------------------

describe('detectBranch', () => {
  test('returns opts.branch verbatim when provided', () => {
    installRunGit(() => '')
    const out = rf.detectBranch({ branch: 'release/v1.2.0' })
    expect(out).toBe('release/v1.2.0')
  })

  test('auto-detects single release candidate', () => {
    installRunGit((args) => {
      if (args.includes('branch --list "release/*"'))
        return '  release/v1.2.0\n'
      if (args.includes('branch --list "hotfix/*"')) return ''
      return ''
    })
    const out = rf.detectBranch({})
    expect(out).toBe('release/v1.2.0')
  })

  test('auto-detects single hotfix candidate', () => {
    installRunGit((args) => {
      if (args.includes('branch --list "release/*"')) return ''
      if (args.includes('branch --list "hotfix/*"')) return '* hotfix/v1.1.1\n'
      return ''
    })
    const out = rf.detectBranch({})
    expect(out).toBe('hotfix/v1.1.1')
  })

  test('--type=release narrows candidates to releases only', () => {
    installRunGit((args) => {
      if (args.includes('branch --list "release/*"'))
        return '  release/v1.2.0\n'
      // hotfix listing should NOT be queried when type narrows to release
      if (args.includes('branch --list "hotfix/*"')) return '  hotfix/v0.1.0\n'
      return ''
    })
    const out = rf.detectBranch({ type: 'release' })
    expect(out).toBe('release/v1.2.0')
  })

  test('--type=hotfix narrows candidates to hotfixes only', () => {
    installRunGit((args) => {
      if (args.includes('branch --list "release/*"'))
        return '  release/v1.2.0\n'
      if (args.includes('branch --list "hotfix/*"')) return '  hotfix/v1.1.1\n'
      return ''
    })
    const out = rf.detectBranch({ type: 'hotfix' })
    expect(out).toBe('hotfix/v1.1.1')
  })

  test('exits(1) when no candidates found', () => {
    installRunGit(() => '')
    throwOnExit()
    expect(() => rf.detectBranch({})).toThrow('process.exit(1)')
  })

  test('exits(1) when --type filters out every branch', () => {
    installRunGit((args) => {
      if (args.includes('branch --list "release/*"'))
        return '  release/v1.2.0\n'
      return ''
    })
    throwOnExit()
    expect(() => rf.detectBranch({ type: 'hotfix' })).toThrow('process.exit(1)')
  })

  test('multiple candidates + --yes exits(1)', () => {
    installRunGit((args) => {
      if (args.includes('branch --list "release/*"'))
        return '  release/v1.2.0\n  release/v1.3.0\n'
      if (args.includes('branch --list "hotfix/*"')) return ''
      return ''
    })
    throwOnExit()
    expect(() => rf.detectBranch({ yes: true })).toThrow('process.exit(1)')
  })

  test('multiple candidates + CI=true exits(1) (no prompt)', () => {
    process.env.CI = 'true'
    installRunGit((args) => {
      if (args.includes('branch --list "release/*"'))
        return '  release/v1.2.0\n  release/v1.3.0\n'
      if (args.includes('branch --list "hotfix/*"')) return ''
      return ''
    })
    throwOnExit()
    expect(() => rf.detectBranch({})).toThrow('process.exit(1)')
  })

  test('interactive prompt: valid number returns that candidate', () => {
    installRunGit((args) => {
      if (args.includes('branch --list "release/*"'))
        return '  release/v1.2.0\n  release/v1.3.0\n'
      if (args.includes('branch --list "hotfix/*"')) return ''
      return ''
    })
    // promptTextSync reads from fd 0; mock the helper directly.
    const promptSpy = spyOn(prompts, 'promptTextSync').mockImplementation(
      () => '2'
    )
    const logSpy = spyOn(console, 'log').mockImplementation(() => {})
    const out = rf.detectBranch({})
    expect(out).toBe('release/v1.3.0')
    promptSpy.mockRestore()
    logSpy.mockRestore()
  })

  test('interactive prompt: NaN input exits(1)', () => {
    installRunGit((args) => {
      if (args.includes('branch --list "release/*"'))
        return '  release/v1.2.0\n  release/v1.3.0\n'
      if (args.includes('branch --list "hotfix/*"')) return ''
      return ''
    })
    const promptSpy = spyOn(prompts, 'promptTextSync').mockImplementation(
      () => 'not-a-number'
    )
    const logSpy = spyOn(console, 'log').mockImplementation(() => {})
    throwOnExit()
    expect(() => rf.detectBranch({})).toThrow('process.exit(1)')
    promptSpy.mockRestore()
    logSpy.mockRestore()
  })

  test('interactive prompt: out-of-range index exits(1)', () => {
    installRunGit((args) => {
      if (args.includes('branch --list "release/*"'))
        return '  release/v1.2.0\n  release/v1.3.0\n'
      if (args.includes('branch --list "hotfix/*"')) return ''
      return ''
    })
    const promptSpy = spyOn(prompts, 'promptTextSync').mockImplementation(
      () => '99'
    )
    const logSpy = spyOn(console, 'log').mockImplementation(() => {})
    throwOnExit()
    expect(() => rf.detectBranch({})).toThrow('process.exit(1)')
    promptSpy.mockRestore()
    logSpy.mockRestore()
  })

  test('interactive prompt: zero input exits(1) (out of range)', () => {
    installRunGit((args) => {
      if (args.includes('branch --list "release/*"'))
        return '  release/v1.2.0\n  release/v1.3.0\n'
      if (args.includes('branch --list "hotfix/*"')) return ''
      return ''
    })
    const promptSpy = spyOn(prompts, 'promptTextSync').mockImplementation(
      () => '0'
    )
    const logSpy = spyOn(console, 'log').mockImplementation(() => {})
    throwOnExit()
    expect(() => rf.detectBranch({})).toThrow('process.exit(1)')
    promptSpy.mockRestore()
    logSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// ensureBranchMatchesType
// ---------------------------------------------------------------------------

describe('ensureBranchMatchesType', () => {
  test('returns "release" for a release branch with no requested type', () => {
    const out = rf.ensureBranchMatchesType('release/v1.2.0', undefined)
    expect(out).toBe('release')
  })

  test('returns "hotfix" for a hotfix branch with no requested type', () => {
    const out = rf.ensureBranchMatchesType('hotfix/v1.1.1', undefined)
    expect(out).toBe('hotfix')
  })

  test('accepts matching requested type', () => {
    expect(rf.ensureBranchMatchesType('release/v1.2.0', 'release')).toBe(
      'release'
    )
    expect(rf.ensureBranchMatchesType('hotfix/v1.1.1', 'hotfix')).toBe('hotfix')
  })

  test('rejects type/branch mismatch (release branch, requested hotfix)', () => {
    throwOnExit()
    expect(() =>
      rf.ensureBranchMatchesType('release/v1.2.0', 'hotfix')
    ).toThrow('process.exit(1)')
  })

  test('rejects type/branch mismatch (hotfix branch, requested release)', () => {
    throwOnExit()
    expect(() =>
      rf.ensureBranchMatchesType('hotfix/v1.1.1', 'release')
    ).toThrow('process.exit(1)')
  })

  test('non-release/hotfix branch with no requested type returns detected type', () => {
    // Defense against unknown/empty: with no requested type, non-empty
    // detected types pass through unchanged. detectBranch itself filters
    // via listBranchesByType so this is an edge-case guard.
    expect(rf.ensureBranchMatchesType('feature/foo', undefined)).toBe('feature')
    expect(rf.ensureBranchMatchesType('main', undefined)).toBe('main')
  })

  test('rejects empty branch string (detected="unknown")', () => {
    throwOnExit()
    expect(() => rf.ensureBranchMatchesType('', undefined)).toThrow(
      'process.exit(1)'
    )
  })

  test('rejects feature/* branch when --type=release is requested', () => {
    throwOnExit()
    expect(() => rf.ensureBranchMatchesType('feature/foo', 'release')).toThrow(
      'process.exit(1)'
    )
  })
})

// ---------------------------------------------------------------------------
// extractVersion
// ---------------------------------------------------------------------------

describe('extractVersion', () => {
  test('extracts version from release branch name', () => {
    expect(rf.extractVersion('release/v1.2.0')).toBe('1.2.0')
  })

  test('extracts version from hotfix branch name', () => {
    expect(rf.extractVersion('hotfix/v1.1.1')).toBe('1.1.1')
  })

  test('handles multi-digit versions', () => {
    expect(rf.extractVersion('release/v10.20.30')).toBe('10.20.30')
  })

  test('returns null when branch has no version suffix', () => {
    expect(rf.extractVersion('release/no-version')).toBeNull()
  })

  test('returns null for branches without a slash', () => {
    expect(rf.extractVersion('main')).toBeNull()
  })

  test('returns null for partial version (e.g., v1.2)', () => {
    expect(rf.extractVersion('release/v1.2')).toBeNull()
  })

  test('returns null for prerelease suffix (e.g., v1.2.0-rc1)', () => {
    expect(rf.extractVersion('release/v1.2.0-rc1')).toBeNull()
  })

  test('returns null for build-metadata suffix (e.g., v1.2.0+build.1)', () => {
    expect(rf.extractVersion('release/v1.2.0+build.1')).toBeNull()
  })

  test('returns null for empty branch', () => {
    expect(rf.extractVersion('')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// generateJsonSummary
// ---------------------------------------------------------------------------

describe('generateJsonSummary', () => {
  test('produces expected shape on success', () => {
    const ops = [{ type: 'success', message: 'Release/hotfix finalized.' }]
    const json = rf.generateJsonSummary('ok', 'release/v1.2.0', '1.2.0', ops)
    const parsed = JSON.parse(json)
    expect(parsed).toEqual({
      status: 'ok',
      branch: 'release/v1.2.0',
      version: '1.2.0',
      operations: ops
    })
  })

  test('produces expected shape on error (empty branch/version)', () => {
    const ops = [{ type: 'error', message: 'Unexpected error: boom' }]
    const json = rf.generateJsonSummary('error', '', '', ops)
    const parsed = JSON.parse(json)
    expect(parsed.status).toBe('error')
    expect(parsed.branch).toBe('')
    expect(parsed.version).toBe('')
    expect(parsed.operations).toEqual(ops)
  })

  test('passes operations array through unchanged (order preserved)', () => {
    const ops = [
      { type: 'success', message: 'a' },
      { type: 'success', message: 'b' }
    ]
    const parsed = JSON.parse(rf.generateJsonSummary('ok', 'b', '0.0.1', ops))
    expect(parsed.operations).toEqual(ops)
  })

  test('handles empty operations array', () => {
    const parsed = JSON.parse(rf.generateJsonSummary('ok', 'b', '0.0.1', []))
    expect(parsed.operations).toEqual([])
  })
})
