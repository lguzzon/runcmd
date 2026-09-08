import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GuardError } from '../lib/validators.js'

let dir
let ru

// Point GITFLOW_ROOT at a temp fixture so version.txt/CHANGELOG.md resolve
// there, not at the repo root. Import once after env set.
beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'ru-'))
  process.env.GITFLOW_ROOT = dir
  ru = await import('./release-utils.js')
})

afterAll(() => {
  delete process.env.GITFLOW_ROOT
  rmSync(dir, { recursive: true, force: true })
})

describe('promptVersion', () => {
  test('returns explicit --version when valid', async () => {
    await expect(ru.promptVersion('1.0.0', { version: '2.5.0' })).resolves.toBe(
      '2.5.0'
    )
  })

  test('rejects invalid --version by throwing GuardError', async () => {
    await expect(
      ru.promptVersion('1.0.0', { version: 'not-semver' })
    ).rejects.toThrow(GuardError)
  })

  test('--yes returns bumped version without prompting', async () => {
    await expect(
      ru.promptVersion('1.2.3', { yes: true, bump: 'minor' })
    ).resolves.toBe('1.3.0')
    await expect(
      ru.promptVersion('1.2.3', { yes: true, bump: 'major' })
    ).resolves.toBe('2.0.0')
    await expect(
      ru.promptVersion('1.2.3', { yes: true, bump: 'patch' })
    ).resolves.toBe('1.2.4')
  })

  test('no bump returns version unchanged (caller supplies defaultBump)', async () => {
    await expect(
      ru.promptVersion('1.2.3', { yes: true, bump: undefined })
    ).resolves.toBe('1.2.3')
  })
})

describe('updateVersionFile', () => {
  test('writes version on first line, keeps rest', () => {
    writeFileSync(join(dir, 'version.txt'), '1.0.0\nsecond line\n')
    expect(ru.updateVersionFile('2.0.0', { dryRun: false })).toBe(true)
    const lines = readFileSync(join(dir, 'version.txt'), 'utf-8').split('\n')
    expect(lines[0]).toBe('2.0.0')
    expect(lines[1]).toBe('second line')
  })

  test('dryRun returns false and leaves file unchanged', () => {
    writeFileSync(join(dir, 'version.txt'), '1.0.0\n')
    expect(ru.updateVersionFile('3.0.0', { dryRun: true })).toBe(false)
    expect(readFileSync(join(dir, 'version.txt'), 'utf-8').split('\n')[0]).toBe(
      '1.0.0'
    )
  })

  test('missing version.txt throws GuardError without creating file', () => {
    rmSync(join(dir, 'version.txt'), { force: true })
    expect(() => ru.updateVersionFile('2.0.0', { dryRun: false })).toThrow(
      GuardError
    )
    expect(existsSync(join(dir, 'version.txt'))).toBe(false)
  })
})

describe('normalizeBranchName', () => {
  test('prepends v when name lacks v prefix', () => {
    expect(ru.normalizeBranchName('1.2.0', 'v9.9.9')).toBe('v1.2.0')
  })

  test('keeps name as-is when v prefix present', () => {
    expect(ru.normalizeBranchName('v1.2.0', 'v9.9.9')).toBe('v1.2.0')
  })

  test('falls back to fallback when name empty/undefined', () => {
    expect(ru.normalizeBranchName(undefined, 'v1.2.0')).toBe('v1.2.0')
    expect(ru.normalizeBranchName(null, 'v1.2.0')).toBe('v1.2.0')
    expect(ru.normalizeBranchName('', 'v1.2.0')).toBe('v1.2.0')
  })
})

describe('buildBranchName', () => {
  test('falls back to v{newVersion} when name is sentinel-shaped string', () => {
    // Any non-empty value is treated as a real name; the historical
    // `nextRelease`/`nextHotfix` sentinels have been removed from parseArgs.
    expect(ru.buildBranchName('', 'v1.2.0', 'release/')).toBe('release/v1.2.0')
  })

  test('prepends v when name lacks v prefix', () => {
    expect(ru.buildBranchName('1.2.0', 'v9.9.9', 'release/')).toBe(
      'release/v1.2.0'
    )
  })

  test('keeps name as-is when v prefix present', () => {
    expect(ru.buildBranchName('v1.2.0', 'v9.9.9', 'release/')).toBe(
      'release/v1.2.0'
    )
  })

  test('falls back to v{newVersion} when name missing', () => {
    expect(ru.buildBranchName(undefined, 'v1.2.0', 'release/')).toBe(
      'release/v1.2.0'
    )
  })

  test('finish uses tag as fallback without double v', () => {
    expect(ru.buildBranchName(undefined, 'v1.2.0', 'hotfix/')).toBe(
      'hotfix/v1.2.0'
    )
  })
})

describe('buildFinishCommand', () => {
  test('assembles push + tag + message flags in correct order', () => {
    expect(
      ru.buildFinishCommand({
        typeLabel: 'release',
        name: 'v1.2.0',
        tag: 'v1.2.0',
        message: 'Release 1.2.0',
        push: true,
        offline: false
      })
    ).toBe('release finish -p -T v1.2.0 -m "Release 1.2.0" v1.2.0')
  })

  test('omits -p when offline (push ignored in offline mode)', () => {
    expect(
      ru.buildFinishCommand({
        typeLabel: 'hotfix',
        name: 'v1.1.1',
        tag: 'v1.1.1',
        message: 'Hotfix 1.1.1',
        push: true,
        offline: true
      })
    ).toBe('hotfix finish -T v1.1.1 -m "Hotfix 1.1.1" v1.1.1')
  })

  test('omits -p when push is false', () => {
    expect(
      ru.buildFinishCommand({
        typeLabel: 'release',
        name: 'v1.2.0',
        tag: 'v1.2.0',
        message: 'Release 1.2.0',
        push: false,
        offline: false
      })
    ).toBe('release finish -T v1.2.0 -m "Release 1.2.0" v1.2.0')
  })

  test('builds minimal command with only tag and name', () => {
    expect(
      ru.buildFinishCommand({
        typeLabel: 'release',
        name: 'v1.2.0',
        tag: 'v1.2.0',
        message: undefined,
        push: false,
        offline: false
      })
    ).toBe('release finish -T v1.2.0 v1.2.0')
  })
})
