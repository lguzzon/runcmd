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

let dir
let ru
const originalExit = process.exit

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

function throwOnExit() {
  process.exit = (code) => {
    throw new Error(`process.exit(${code})`)
  }
}

describe('promptVersion', () => {
  test('returns explicit --version when valid', async () => {
    await expect(ru.promptVersion('1.0.0', { version: '2.5.0' })).resolves.toBe(
      '2.5.0'
    )
  })

  test('rejects invalid --version', async () => {
    process.exit = throwOnExit()
    await expect(
      ru.promptVersion('1.0.0', { version: 'not-semver' })
    ).rejects.toThrow('process.exit')
    process.exit = originalExit
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

  test('missing version.txt exits without creating file', () => {
    rmSync(join(dir, 'version.txt'), { force: true })
    process.exit = throwOnExit()
    expect(() => ru.updateVersionFile('2.0.0', { dryRun: false })).toThrow(
      'process.exit'
    )
    process.exit = originalExit
    expect(existsSync(join(dir, 'version.txt'))).toBe(false)
  })
})
