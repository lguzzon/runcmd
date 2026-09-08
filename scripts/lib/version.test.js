import { describe, expect, test } from 'bun:test'
import {
  compareVersions,
  incrementVersion,
  parseVersion,
  validateVersion
} from './version.js'
import { getBranchType, validateBranchName } from './validators.js'

describe('validateVersion', () => {
  test('accepts valid semver', () => {
    expect(validateVersion('0.0.0')).toBe(true)
    expect(validateVersion('1.2.3')).toBe(true)
    expect(validateVersion('10.200.3000')).toBe(true)
  })

  test('rejects malformed versions', () => {
    expect(validateVersion('')).toBe(false)
    expect(validateVersion('1.2')).toBe(false)
    expect(validateVersion('1.2.3.4')).toBe(false)
    expect(validateVersion('v1.2.3')).toBe(false)
    expect(validateVersion('01.2.3')).toBe(false)
    expect(validateVersion('1.2.3-alpha')).toBe(false)
    expect(validateVersion('a.b.c')).toBe(false)
  })
})

describe('parseVersion', () => {
  test('splits into numeric parts', () => {
    expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 })
    expect(parseVersion('0.0.0')).toEqual({ major: 0, minor: 0, patch: 0 })
  })
})

describe('incrementVersion', () => {
  test('major bumps to x.0.0', () => {
    expect(incrementVersion('1.2.3', 'major')).toBe('2.0.0')
  })

  test('minor bumps to x.y.0', () => {
    expect(incrementVersion('1.2.3', 'minor')).toBe('1.3.0')
  })

  test('patch bumps patch', () => {
    expect(incrementVersion('1.2.3', 'patch')).toBe('1.2.4')
  })

  test('is case-insensitive', () => {
    expect(incrementVersion('1.2.3', 'MAJOR')).toBe('2.0.0')
  })

  test('unknown bump returns version unchanged', () => {
    expect(incrementVersion('1.2.3', 'invalid')).toBe('1.2.3')
    expect(incrementVersion('1.2.3', undefined)).toBe('1.2.3')
  })
})

describe('compareVersions', () => {
  test('orders versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1)
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1)
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1)
    expect(compareVersions('2.0.0', '1.99.99')).toBe(1)
  })
})

describe('getBranchType', () => {
  test('classifies prefixed branches', () => {
    expect(getBranchType('feature/foo')).toBe('feature')
    expect(getBranchType('release/1.0.0')).toBe('release')
    expect(getBranchType('hotfix/urgent')).toBe('hotfix')
    expect(getBranchType('support/legacy')).toBe('support')
  })

  test('classifies core branches', () => {
    expect(getBranchType('main')).toBe('main')
    expect(getBranchType('master')).toBe('main')
    expect(getBranchType('develop')).toBe('develop')
  })

  test('handles empty and unknown', () => {
    expect(getBranchType('')).toBe('unknown')
    expect(getBranchType('random-name')).toBe('unknown')
    expect(getBranchType(undefined)).toBe('unknown')
  })
})

describe('validateBranchName', () => {
  test('accepts valid names', () => {
    expect(validateBranchName('my-feature', 'feature')).toBe(true)
    expect(validateBranchName('my-release', 'release')).toBe(true)
    expect(validateBranchName('fix_issue', 'hotfix')).toBe(true)
  })

  test('rejects invalid characters (incl. dots)', () => {
    expect(validateBranchName('my feature', 'feature')).toBe(false)
    expect(validateBranchName('my/feature', 'feature')).toBe(false)
    // release names carry versions like v1.2.0 but this regex forbids dots;
    // release flow validates versions separately, so a dot name is invalid here
    expect(validateBranchName('v1.2.0', 'release')).toBe(false)
  })

  test('rejects unknown branch type', () => {
    expect(validateBranchName('anything', 'bogus')).toBe(false)
  })
})
