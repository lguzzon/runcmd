import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

// ---------------------------------------------------------------------------
// options.js — parseFlags + defaults
// ---------------------------------------------------------------------------

const opts = await import('./options.js')

const originalExit = process.exit
const originalCI = process.env.CI

beforeEach(() => {
  process.exit = (code) => {
    throw new Error(`__EXIT__${code}__`)
  }
  delete process.env.CI
})

afterEach(() => {
  process.exit = originalExit
  if (originalCI === undefined) delete process.env.CI
  else process.env.CI = originalCI
})

describe('releaseInitDefaults', () => {
  test('starts with type="release" and all booleans false', () => {
    expect(opts.releaseInitDefaults).toEqual({
      type: 'release',
      bump: undefined,
      version: undefined,
      push: false,
      dryRun: false,
      yes: false,
      noChangelog: false,
      offline: false,
      help: false
    })
  })
})

describe('releaseFinalizeDefaults', () => {
  test('starts with no type or branch set and all booleans false', () => {
    expect(opts.releaseFinalizeDefaults).toEqual({
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
})

describe('parseFlags', () => {
  test('empty argv returns a copy of the defaults', () => {
    const out = opts.parseFlags([], opts.releaseFinalizeDefaults)
    expect(out).toEqual(opts.releaseFinalizeDefaults)
    // mutation of returned object does not affect defaults
    out.branch = 'mutated'
    expect(opts.releaseFinalizeDefaults.branch).toBeUndefined()
  })

  test('parses all supported flags against releaseInitDefaults', () => {
    const out = opts.parseFlags(
      [
        '--type',
        'hotfix',
        '--bump',
        'major',
        '--version',
        '2.0.0',
        '--push',
        '--dry-run',
        '--yes',
        '--no-changelog',
        '--offline',
        '--help'
      ],
      opts.releaseInitDefaults
    )
    expect(out).toEqual({
      type: 'hotfix',
      bump: 'major',
      version: '2.0.0',
      push: true,
      dryRun: true,
      yes: true,
      noChangelog: true,
      offline: true,
      help: true
    })
  })

  test('parses finalize-only flags (--branch/--keep-branch/--json)', () => {
    const out = opts.parseFlags(
      ['--branch', 'release/v1.2.0', '--keep-branch', '--json'],
      opts.releaseFinalizeDefaults
    )
    expect(out.branch).toBe('release/v1.2.0')
    expect(out.keepBranch).toBe(true)
    expect(out.json).toBe(true)
  })

  test('-h is equivalent to --help', () => {
    expect(opts.parseFlags(['-h'], opts.releaseInitDefaults).help).toBe(true)
    expect(opts.parseFlags(['--help'], opts.releaseInitDefaults).help).toBe(
      true
    )
  })

  test('unknown arguments are ignored (backward compatibility)', () => {
    const out = opts.parseFlags(
      ['--unknown', 'value', 'positional', '--another'],
      opts.releaseFinalizeDefaults
    )
    expect(out).toEqual(opts.releaseFinalizeDefaults)
  })

  test('CI=true forces opts.yes=true even without --yes', () => {
    process.env.CI = 'true'
    const out = opts.parseFlags(['--push'], opts.releaseInitDefaults)
    expect(out.yes).toBe(true)
  })

  test('CI unset leaves opts.yes=false by default', () => {
    delete process.env.CI
    const out = opts.parseFlags([], opts.releaseInitDefaults)
    expect(out.yes).toBe(false)
  })

  test('does not mutate caller argv', () => {
    const argv = ['--push', '--dry-run', '--yes']
    const original = [...argv]
    opts.parseFlags(argv, opts.releaseInitDefaults)
    expect(argv).toEqual(original)
  })

  test('does not mutate the defaults object', () => {
    const out = opts.parseFlags(['--push'], opts.releaseInitDefaults)
    expect(out).not.toBe(opts.releaseInitDefaults)
  })
})
