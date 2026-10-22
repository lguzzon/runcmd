import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Point GITFLOW_ROOT at a temp fixture so README.md resolves there.
const dir = mkdtempSync(join(tmpdir(), 'rm-'))
process.env.GITFLOW_ROOT = dir
const { updateReadmeVersion } = await import('./readme.js')

const BADGE =
  '[![Version](https://img.shields.io/badge/version-1.11.4-blue)](version.txt)'
const readmePath = join(dir, 'README.md')

function writeReadme(body) {
  writeFileSync(readmePath, body)
}

afterAll(() => {
  delete process.env.GITFLOW_ROOT
  rmSync(dir, { recursive: true, force: true })
})

beforeEach(() => {
  rmSync(readmePath, { force: true })
})

describe('updateReadmeVersion', () => {
  test('rewrites the badge and the footer', () => {
    writeReadme(`# runcmd\n\n${BADGE}\n\nprose\n\n---\n\n*Version 1.11.4*\n`)
    expect(updateReadmeVersion('2.0.2', {})).toBe(true)
    const out = readFileSync(readmePath, 'utf-8')
    expect(out).toContain('badge/version-2.0.2-blue')
    expect(out).toContain('*Version 2.0.2*')
    expect(out).not.toContain('1.11.4')
  })

  test('leaves unrelated version-shaped text alone', () => {
    writeReadme('# runcmd\n\nNeeds bash 1.2.3 and curl.\n\n*Version 1.11.4*\n')
    expect(updateReadmeVersion('2.0.2', {})).toBe(true)
    const out = readFileSync(readmePath, 'utf-8')
    expect(out).toContain('Needs bash 1.2.3')
    expect(out).toContain('*Version 2.0.2*')
  })

  test('returns false without writing when already current', () => {
    const same = `# runcmd\n\n${BADGE.replace('1.11.4', '2.0.2')}\n\n*Version 2.0.2*\n`
    writeReadme(same)
    expect(updateReadmeVersion('2.0.2', {})).toBe(false)
    expect(readFileSync(readmePath, 'utf-8')).toBe(same)
  })

  test('dry-run reports without writing', () => {
    const before = `# runcmd\n\n${BADGE}\n\n*Version 1.11.4*\n`
    writeReadme(before)
    expect(updateReadmeVersion('2.0.2', { dryRun: true })).toBe(false)
    expect(readFileSync(readmePath, 'utf-8')).toBe(before)
  })

  test('returns false instead of throwing when README.md is missing', () => {
    expect(updateReadmeVersion('2.0.2', {})).toBe(false)
  })
})
