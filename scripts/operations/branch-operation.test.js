import { afterAll, afterEach, describe, expect, mock, test } from 'bun:test'

// Stub the low-level git module + the release-utils helpers BEFORE
// importing branch-operation so the helper picks up the stubs at module
// load. Action dispatch is the only non-trivial branch in branch-operation,
// so the stubs only need to record calls.

const gitModulePath = '../lib/git.js'
let runGitImpl = () => ''

mock.module(gitModulePath, () => ({
  runGit: (args, opts = {}) => runGitImpl(args, opts),
  runGitFlow: (args, opts = {}) => runGitImpl(args, opts)
}))

const startCalls = []
const finishCalls = []

mock.module('./release-utils.js', () => ({
  handleStart: async (config, opts) => {
    startCalls.push({ config, opts })
  },
  handleFinish: async (config, opts) => {
    finishCalls.push({ config, opts })
  }
}))

const { mkdtempSync, rmSync, writeFileSync } = await import('node:fs')
const { tmpdir } = await import('node:os')
const { join } = await import('node:path')
const dir = mkdtempSync(join(tmpdir(), 'bo-'))
process.env.GITFLOW_ROOT = dir
writeFileSync(join(dir, 'version.txt'), '1.2.3\n')

// ensureGitFlowInitialized uses runGit internally. Stub runGit to make the
// gitflow.initialized config check pass.
runGitImpl = (args) => {
  if (args.includes('config --get gitflow.initialized')) return 'true'
  return ''
}

const bo = await import('./branch-operation.js')

const originalExit = process.exit

function throwOnExit() {
  process.exit = (code) => {
    throw new Error(`process.exit(${code})`)
  }
}

afterAll(() => {
  delete process.env.GITFLOW_ROOT
  rmSync(dir, { recursive: true, force: true })
})

afterEach(() => {
  process.exit = originalExit
  startCalls.length = 0
  finishCalls.length = 0
})

const releaseConfig = {
  defaultBump: 'minor',
  defaultBase: 'develop',
  prefix: 'release/',
  typeLabel: 'release',
  printHelp: () => {}
}

const hotfixConfig = {
  defaultBump: 'patch',
  defaultBase: 'main',
  prefix: 'hotfix/',
  typeLabel: 'hotfix',
  printHelp: () => {}
}

describe('handleBranchOperation', () => {
  test('start action dispatches to handleStart with per-type config', async () => {
    await bo.handleBranchOperation('start', { offline: true }, releaseConfig)
    expect(startCalls).toHaveLength(1)
    expect(startCalls[0].config.typeLabel).toBe('release')
    expect(startCalls[0].config.prefix).toBe('release/')
    expect(finishCalls).toHaveLength(0)
  })

  test('finish action dispatches to handleFinish with per-type config', async () => {
    await bo.handleBranchOperation('finish', { offline: true }, hotfixConfig)
    expect(finishCalls).toHaveLength(1)
    expect(finishCalls[0].config.typeLabel).toBe('hotfix')
    expect(finishCalls[0].config.prefix).toBe('hotfix/')
    expect(startCalls).toHaveLength(0)
  })

  test('opts.help short-circuits before dispatching', async () => {
    let helpCalled = false
    const cfg = { ...releaseConfig, printHelp: () => (helpCalled = true) }
    await bo.handleBranchOperation('start', { help: true }, cfg)
    expect(helpCalled).toBe(true)
    expect(startCalls).toHaveLength(0)
    expect(finishCalls).toHaveLength(0)
  })

  test('unknown action exits with help invocation', async () => {
    process.exit = throwOnExit()
    let helpCalled = false
    const cfg = { ...releaseConfig, printHelp: () => (helpCalled = true) }
    await expect(
      bo.handleBranchOperation('garbage', { offline: true }, cfg)
    ).rejects.toThrow('process.exit')
    expect(helpCalled).toBe(true)
  })
})
