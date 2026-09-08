import { afterAll, describe, expect, mock, test } from 'bun:test'

// release.js imports COLOR_BOLD/COLOR_RESET from ../git-flow.js which
// re-exports parseArgs from ./cli.js, and cli.js top-level references
// releaseConfig before it is initialized. Stub git-flow.js to break
// the cycle so the module loads cleanly under --isolate.
mock.module('../git-flow.js', () => ({
  COLOR_BOLD: '',
  COLOR_RESET: ''
}))

const { hotfixConfig, printHelp } = await import('./hotfix.js')

afterAll(() => {
  mock.module('../git-flow.js', () => ({}))
})

describe('hotfixConfig', () => {
  test('exposes the correct default bump, base, prefix, typeLabel', () => {
    expect(hotfixConfig.defaultBump).toBe('patch')
    expect(hotfixConfig.defaultBase).toBe('main')
    expect(hotfixConfig.prefix).toBe('hotfix/')
    expect(hotfixConfig.typeLabel).toBe('hotfix')
  })

  test('wires the module-level printHelp into the config', () => {
    expect(hotfixConfig.printHelp).toBe(printHelp)
  })

  test('contains every BranchOperationConfig field', () => {
    expect(Object.keys(hotfixConfig).sort()).toEqual([
      'defaultBase',
      'defaultBump',
      'prefix',
      'printHelp',
      'typeLabel'
    ])
  })
})

describe('printHelp', () => {
  test('logs the help banner to stdout', () => {
    const calls = []
    const origLog = console.log
    console.log = (msg) => calls.push(msg)
    try {
      printHelp()
    } finally {
      console.log = origLog
    }
    expect(calls).toHaveLength(1)
    expect(calls[0]).toContain('Git Flow Hotfix')
  })
})
