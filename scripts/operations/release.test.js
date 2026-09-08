import { afterAll, describe, expect, mock, test } from 'bun:test'

// release.js imports COLOR_BOLD/COLOR_RESET from ../git-flow.js which
// re-exports parseArgs from ./cli.js, and cli.js top-level references
// releaseConfig before it is initialized. Stub git-flow.js to break
// the cycle so the module loads cleanly under --isolate.
mock.module('../git-flow.js', () => ({
  COLOR_BOLD: '',
  COLOR_RESET: ''
}))

const { printHelp, releaseConfig } = await import('./release.js')

afterAll(() => {
  mock.module('../git-flow.js', () => ({}))
})

describe('releaseConfig', () => {
  test('exposes the correct default bump, base, prefix, typeLabel', () => {
    expect(releaseConfig.defaultBump).toBe('minor')
    expect(releaseConfig.defaultBase).toBe('develop')
    expect(releaseConfig.prefix).toBe('release/')
    expect(releaseConfig.typeLabel).toBe('release')
  })

  test('wires the module-level printHelp into the config', () => {
    expect(releaseConfig.printHelp).toBe(printHelp)
  })

  test('contains every BranchOperationConfig field', () => {
    expect(Object.keys(releaseConfig).sort()).toEqual([
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
    expect(calls[0]).toContain('Git Flow Release')
  })
})
