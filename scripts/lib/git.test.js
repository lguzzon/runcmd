import { describe, expect, test } from 'bun:test'
import { splitArgs } from './git.js'

describe('splitArgs', () => {
  test('splits on spaces', () => {
    expect(splitArgs('status --porcelain')).toEqual(['status', '--porcelain'])
    expect(splitArgs('log --oneline -5')).toEqual(['log', '--oneline', '-5'])
  })

  test('keeps quoted tokens intact', () => {
    expect(splitArgs('commit -m "bump version to 1.2.0"')).toEqual([
      'commit',
      '-m',
      'bump version to 1.2.0'
    ])
  })

  test('quoted token with spaces stays one arg', () => {
    expect(splitArgs('merge "my feature branch"')).toEqual([
      'merge',
      'my feature branch'
    ])
  })

  test('supports escaped quotes inside quoted tokens', () => {
    expect(splitArgs('commit -m "say \\"hi\\" now"')).toEqual([
      'commit',
      '-m',
      'say "hi" now'
    ])
  })

  test('backslash escape outside quotes', () => {
    expect(splitArgs('echo foo\\ bar')).toEqual(['echo', 'foo bar'])
  })

  test('empty string yields no args', () => {
    expect(splitArgs('')).toEqual([])
    expect(splitArgs('   ')).toEqual([])
  })

  test('single token without spaces', () => {
    expect(splitArgs('status')).toEqual(['status'])
  })
})
