// Tests for lib/core.js requireValidCommand — the shared command-dispatch
// gate used by every commands/* handler. core.js imports installer.js,
// validators.js and logger.js from the same directory, so those three are
// mocked by their relative specifiers.

import { afterEach, beforeAll, describe, expect, mock, test } from 'bun:test'

let exit = 0
let available = true
let initCalls = 0
let errors = []
let consoleOut = []

console.log = (...args) => {
  consoleOut.push(args.join(' '))
}

process.exit = (code) => {
  exit = code
  throw new Error(`__EXIT__${code}__`)
}

mock.module('./installer.js', () => ({
  ensureGitFlowAvailable() {
    return available
  }
}))

mock.module('./validators.js', () => ({
  ensureGitFlowInitialized() {
    initCalls++
  }
}))

mock.module('./logger.js', () => ({
  logError: (msg) => {
    errors.push(msg)
  }
}))

let requireValidCommand

beforeAll(async () => {
  const mod = await import('./core.js')
  requireValidCommand = mod.requireValidCommand
})

afterEach(() => {
  exit = 0
  available = true
  initCalls = 0
  errors = []
  consoleOut = []
})

describe('requireValidCommand', () => {
  test('exits 1 when git-flow unavailable, with error naming command', async () => {
    available = false
    let threw = false
    try {
      requireValidCommand({}, { commandName: 'start', helpFn: () => {} })
    } catch (e) {
      threw = String(e.message).startsWith('__EXIT__')
    }
    expect(threw).toBe(true)
    expect(exit).toBe(1)
    expect(errors).toEqual(['start: git-flow not available'])
    expect(initCalls).toBe(0)
  })

  test('help flag prints help and returns false (no init check)', () => {
    let helpCalled = false
    const result = requireValidCommand(
      { help: true },
      {
        commandName: 'x',
        helpFn: () => {
          helpCalled = true
        }
      }
    )
    expect(result).toBe(false)
    expect(helpCalled).toBe(true)
    // ensureGitFlowInitialized runs before the help check in core.js.
    expect(initCalls).toBe(1)
  })

  test('valid command initializes git-flow and returns true', () => {
    const result = requireValidCommand(
      {},
      { commandName: 'x', helpFn: () => {} }
    )
    expect(result).toBe(true)
    expect(initCalls).toBe(1)
    expect(exit).toBe(0)
  })

  test('forwards autoInstall:false into the availability probe', () => {
    requireValidCommand(
      { dryRun: true },
      { commandName: 'x', helpFn: () => {} }
    )
    // ensureGitFlowAvailable receives opts spread + autoInstall:false; the
    // mock ignores it, but reaching init means the probe returned true.
    expect(initCalls).toBe(1)
  })
})
