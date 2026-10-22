import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Repo-root anchoring: version/changelog/readme writes must land at the git
// toplevel even when the process cwd is a subdirectory (the CLI can be
// invoked from anywhere inside the repo). GITFLOW_ROOT must not be set so
// the lazy `git rev-parse --show-toplevel` resolution is exercised.

delete process.env.GITFLOW_ROOT

const version = await import('./version.js')
const changelog = await import('./changelog.js')
const readme = await import('./readme.js')
const releaseUtils = await import('../operations/release-utils.js')

let repoDir
let originalCwd

beforeAll(() => {
  originalCwd = process.cwd()
  repoDir = mkdtempSync(join(tmpdir(), 'repopath-realrepo-'))
  // Real git repo so `git rev-parse --show-toplevel` resolves.
  Bun.spawnSync(['git', 'init', '--initial-branch=main', '--quiet'], {
    cwd: repoDir
  })
  // git rev-parse --show-toplevel works from any directory inside the tree
  const sub = join(repoDir, 'sub', 'dir')
  mkdirSync(sub, { recursive: true })
  process.chdir(sub)
})

afterAll(() => {
  process.chdir(originalCwd)
  if (repoDir) rmSync(repoDir, { recursive: true, force: true })
})

describe('file paths resolve to the git toplevel from a subdirectory', () => {
  test('versionFile() points at the toplevel, not the cwd', () => {
    expect(version.versionFile()).toBe(`${repoDir}/version.txt`)
  })

  test('readVersion throws when version.txt is absent from the toplevel', () => {
    expect(() => version.readVersion()).toThrow(/version.txt not found/)
    expect(existsSync(join(process.cwd(), 'version.txt'))).toBe(false)
  })

  test('readVersion reads the toplevel file', () => {
    writeFileSync(join(repoDir, 'version.txt'), '1.2.3\n')
    expect(version.readVersion()).toBe('1.2.3')
  })

  test('updateVersionFile writes at the toplevel', () => {
    writeFileSync(join(repoDir, 'version.txt'), '1.2.3\n')
    releaseUtils.updateVersionFile('1.3.0', { dryRun: false })
    expect(readFileSync(join(repoDir, 'version.txt'), 'utf-8')).toBe('1.3.0\n')
    expect(existsSync(join(process.cwd(), 'version.txt'))).toBe(false)
  })

  test('appendChangelog writes at the toplevel', () => {
    writeFileSync(join(repoDir, 'CHANGELOG.md'), '# Changelog\n', 'utf-8')
    changelog.appendChangelog('1.3.0', { dryRun: false })
    const content = readFileSync(join(repoDir, 'CHANGELOG.md'), 'utf-8')
    expect(content).toContain('## v1.3.0')
    expect(existsSync(join(process.cwd(), 'CHANGELOG.md'))).toBe(false)
  })

  test('updateReadmeVersion writes at the toplevel', () => {
    writeFileSync(
      join(repoDir, 'README.md'),
      '# runcmd\n\n*Version 1.2.3*\n',
      'utf-8'
    )
    readme.updateReadmeVersion('1.3.0', { dryRun: false })
    const content = readFileSync(join(repoDir, 'README.md'), 'utf-8')
    expect(content).toContain('1.3.0')
    expect(existsSync(join(process.cwd(), 'README.md'))).toBe(false)
  })
})
