import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  mock,
  test
} from 'bun:test'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Mock the git module BEFORE importing changelog so the static binding picks
// up the stub. Each test installs its own implementation via installRunGit.
const gitModulePath = './git.js'
let runGitImpl = () => ''

mock.module(gitModulePath, () => ({
  runGit: (args, opts = {}) => runGitImpl(args, opts),
  runGitFlow: (args, opts = {}) => runGitImpl(args, opts),
  splitArgs: (s) => (s ? s.split(' ').filter(Boolean) : [])
}))

// Point GITFLOW_ROOT at a temp fixture so CHANGELOG.md resolves there.
let dir
let changelog
const originalCwd = process.cwd()

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'cl-'))
  process.env.GITFLOW_ROOT = dir
  // Stay in the fixture dir for readFileSync etc. to behave predictably.
  process.chdir(dir)
  changelog = await import('./changelog.js')
})

afterAll(() => {
  delete process.env.GITFLOW_ROOT
  process.chdir(originalCwd)
  rmSync(dir, { recursive: true, force: true })
})

afterEach(() => {
  runGitImpl = () => ''
  // Clear any CHANGELOG.md written by a previous test.
  const path = join(dir, 'CHANGELOG.md')
  if (existsSync(path)) rmSync(path)
})

function installRunGit(fn) {
  runGitImpl = fn
}

const fixtureDate = (iso) => {
  const d = iso ? new Date(iso) : new Date()
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// getLastTag
// ---------------------------------------------------------------------------

describe('getLastTag', () => {
  test('returns null when describe --tags finds no tag', () => {
    installRunGit(() => null)
    expect(changelog.getLastTag()).toBeNull()
  })

  test('returns the tag string when describe --tags succeeds', () => {
    installRunGit(() => 'v1.0.0')
    expect(changelog.getLastTag()).toBe('v1.0.0')
  })

  test('issues a git describe --tags --abbrev=0 query', () => {
    let captured = null
    installRunGit((args, opts) => {
      captured = { args, opts }
      return null
    })
    changelog.getLastTag()
    expect(captured.args).toBe('describe --tags --abbrev=0')
    expect(captured.opts.allowFail).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// collectCommitsSince
// ---------------------------------------------------------------------------

describe('collectCommitsSince', () => {
  test('returns empty array when no commits exist', () => {
    installRunGit(() => null)
    expect(changelog.collectCommitsSince('v1.0.0')).toEqual([])
  })

  test('returns empty array when git log returns empty string', () => {
    installRunGit(() => '')
    expect(changelog.collectCommitsSince('v1.0.0')).toEqual([])
  })

  test('splits log output on newlines and filters empty lines', () => {
    installRunGit(() => '- commit a\n- commit b\n- commit c\n')
    expect(changelog.collectCommitsSince('v1.0.0')).toEqual([
      '- commit a',
      '- commit b',
      '- commit c'
    ])
  })

  test('omits empty trailing entries (no spurious blank commits)', () => {
    installRunGit(() => '- a\n- b\n\n\n')
    expect(changelog.collectCommitsSince('v1.0.0')).toEqual(['- a', '- b'])
  })

  test('uses HEAD range when ref is null/undefined', () => {
    let captured = null
    installRunGit((args) => {
      captured = args
      return null
    })
    changelog.collectCommitsSince(null)
    expect(captured).toBe('log HEAD --pretty=format:"- %s"')
    changelog.collectCommitsSince(undefined)
    expect(captured).toBe('log HEAD --pretty=format:"- %s"')
  })

  test('uses <ref>..HEAD range when ref is supplied', () => {
    let captured = null
    installRunGit((args) => {
      captured = args
      return null
    })
    changelog.collectCommitsSince('v1.2.3')
    expect(captured).toBe('log v1.2.3..HEAD --pretty=format:"- %s"')
  })
})

// ---------------------------------------------------------------------------
// appendChangelog
// ---------------------------------------------------------------------------

describe('appendChangelog', () => {
  test('creates CHANGELOG.md with v1.2.3 header when file is missing', () => {
    installRunGit(() => null)
    const date = fixtureDate()
    expect(existsSync(join(dir, 'CHANGELOG.md'))).toBe(false)

    const result = changelog.appendChangelog('1.2.3', { dryRun: false })

    expect(result).toBe(true)
    const content = readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8')
    expect(content).toContain(`## v1.2.3 - ${date}`)
    expect(content).toContain('- Internal changes')
  })

  test('renders collected commits as the section body when present', () => {
    installRunGit((args) => {
      if (args.startsWith('describe')) return 'v1.0.0'
      if (args.startsWith('log')) return '- feat: add foo\n- fix: bar bug'
      return ''
    })
    changelog.appendChangelog('1.1.0', { dryRun: false })
    const content = readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8')
    expect(content).toContain('## v1.1.0 -')
    expect(content).toContain('- feat: add foo')
    expect(content).toContain('- fix: bar bug')
    expect(content).not.toContain('- Internal changes')
  })

  test('renders "- Internal changes" when no commits exist since last tag', () => {
    installRunGit((args) => {
      if (args.startsWith('describe')) return 'v1.0.0'
      if (args.startsWith('log')) return null
      return ''
    })
    changelog.appendChangelog('1.1.0', { dryRun: false })
    const content = readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8')
    expect(content).toContain('- Internal changes')
  })

  test('idempotency: second append with same version returns false and leaves file unchanged', () => {
    installRunGit(() => null)
    expect(changelog.appendChangelog('1.2.3', { dryRun: false })).toBe(true)
    const first = readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8')

    // Second call must short-circuit and not touch the file.
    expect(changelog.appendChangelog('1.2.3', { dryRun: false })).toBe(false)
    const second = readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8')
    expect(second).toBe(first)
  })

  test('detects version duplicate via ## v<version> substring match', () => {
    installRunGit(() => null)
    // Pre-populate the file with a section for a different version
    // (and a substring of the target version) to prove the
    // dedup check is precise enough to allow re-writing the same version
    // but not when an exact section already exists.
    writeFileSync(
      join(dir, 'CHANGELOG.md'),
      '## v0.9.0 - 2026-01-01\n- old\n',
      'utf-8'
    )
    expect(changelog.appendChangelog('0.9.0', { dryRun: false })).toBe(false)
    const content = readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8')
    expect(content).toBe('## v0.9.0 - 2026-01-01\n- old\n')
  })

  test('prepends new section before existing content (highest-risk bug guard)', () => {
    installRunGit(() => null)
    writeFileSync(
      join(dir, 'CHANGELOG.md'),
      '## v1.0.0 - 2026-01-01\n- first\n',
      'utf-8'
    )
    changelog.appendChangelog('1.1.0', { dryRun: false })
    const content = readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8')
    // The new section must come BEFORE the old one — reverse order would
    // silently corrupt history.
    const newIdx = content.indexOf('## v1.1.0 -')
    const oldIdx = content.indexOf('## v1.0.0 -')
    expect(newIdx).toBeGreaterThanOrEqual(0)
    expect(oldIdx).toBeGreaterThan(0)
    expect(newIdx).toBeLessThan(oldIdx)
  })

  test('preserves existing content byte-for-byte when prepending', () => {
    installRunGit(() => null)
    const original = '## v1.0.0 - 2026-01-01\n- first\n- second\n\n'
    writeFileSync(join(dir, 'CHANGELOG.md'), original, 'utf-8')
    changelog.appendChangelog('1.1.0', { dryRun: false })
    const content = readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8')
    expect(content.endsWith(original)).toBe(true)
  })

  test('dryRun returns false and does not write the file', () => {
    installRunGit(() => null)
    expect(existsSync(join(dir, 'CHANGELOG.md'))).toBe(false)
    expect(changelog.appendChangelog('1.2.3', { dryRun: true })).toBe(false)
    expect(existsSync(join(dir, 'CHANGELOG.md'))).toBe(false)
  })

  test('dryRun does not write even when CHANGELOG.md already exists', () => {
    installRunGit(() => null)
    const before = '## v1.0.0 - 2026-01-01\n- first\n'
    writeFileSync(join(dir, 'CHANGELOG.md'), before, 'utf-8')
    expect(changelog.appendChangelog('1.1.0', { dryRun: true })).toBe(false)
    expect(readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8')).toBe(before)
  })
})

// ---------------------------------------------------------------------------
// commitChangelog
// ---------------------------------------------------------------------------

describe('commitChangelog', () => {
  test('runs git add then git commit for CHANGELOG.md', () => {
    const calls = []
    installRunGit((args, opts) => {
      calls.push({ args, opts })
      return ''
    })
    changelog.commitChangelog('1.2.3', { dryRun: false })
    expect(calls).toHaveLength(2)
    expect(calls[0].args).toBe('add CHANGELOG.md')
    expect(calls[1].args).toBe('commit -m "docs: update changelog for v1.2.3"')
  })

  test('forwards dryRun=true to both git invocations', () => {
    const calls = []
    installRunGit((args, opts) => {
      calls.push({ args, opts })
      return ''
    })
    changelog.commitChangelog('2.0.0', { dryRun: true })
    expect(calls[0].opts.dryRun).toBe(true)
    expect(calls[1].opts.dryRun).toBe(true)
  })
})
