// Tests for lib/installer.js ensureGitFlowAvailable. The module shells out
// via node:child_process; child_process is mocked so no real git/curl/mktemp
// ever runs. Fake git flow availability is driven by a mutable `gitStatus`.

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test
} from 'bun:test'

let exit = 0
let gitStatus = 1 // git flow version spawn result (1 = not installed)
let execCalls = []
let errors = []
let warns = []
let infos = []
let successes = []
let fakeContent = 'the installer script'
let digestResult = '0'.repeat(64)

let spawnSyncImpl

process.exit = (code) => {
  exit = code
  throw new Error(`__EXIT__${code}__`)
}

// The constant installer SHA256 in installer.js.
const EXPECTED_INSTALLER_SHA =
  '5bc020a856d79e4fb0961f48259614bb8abede22c9c815a9662e0fcd923d221c'

mock.module('node:child_process', () => ({
  spawnSync: (...a) => spawnSyncImpl(...a),
  execSync: (cmd, _opts) => {
    execCalls.push(cmd)
    // mktemp -d prints a temp dir; everything else prints nothing.
    return cmd.startsWith('mktemp') ? '/tmp/gitflow-abc\n' : ''
  }
}))

mock.module('node:fs', () => ({
  readFileSync: () => fakeContent
}))

// Fake SHA256 hasher — digest returns the injectable value so the checksum
// gate in installer.js can be driven without a real pre-image.
mock.module('node:crypto', () => ({
  createHash: () => ({
    update: () => ({ digest: () => digestResult })
  })
}))

mock.module('./logger.js', () => ({
  logError: (m) => errors.push(m),
  logInfo: (m) => infos.push(m),
  logSuccess: (m) => successes.push(m),
  logWarn: (m) => warns.push(m)
}))

let ensureGitFlowAvailable

beforeAll(async () => {
  const mod = await import('./installer.js')
  ensureGitFlowAvailable = mod.ensureGitFlowAvailable
})

beforeEach(() => {
  exit = 0
  gitStatus = 1
  execCalls = []
  errors = []
  warns = []
  infos = []
  successes = []
  fakeContent = 'the installer script'
  digestResult = EXPECTED_INSTALLER_SHA
  spawnSyncImpl = (_bin, _args, _opts) => ({ status: gitStatus })
})

afterEach(() => {})

const safeCall = (opts) => {
  try {
    return ensureGitFlowAvailable(opts)
  } catch (e) {
    if (!String(e.message).startsWith('__EXIT__')) throw e
    return false
  }
}

describe('ensureGitFlowAvailable — already installed', () => {
  test('returns true when `git flow version` succeeds', () => {
    gitStatus = 0
    expect(ensureGitFlowAvailable({})).toBe(true)
    expect(execCalls).toHaveLength(0)
  })
})

describe('ensureGitFlowAvailable — offline', () => {
  test('exits 1 when not available and offline', () => {
    safeCall({ offline: true })
    expect(exit).toBe(1)
    expect(errors.some((e) => e.includes('offline'))).toBe(true)
  })
})

describe('ensureGitFlowAvailable — autoInstall off', () => {
  test('warns and returns false when autoInstall falsy', () => {
    expect(ensureGitFlowAvailable({})).toBe(false)
    expect(warns.some((w) => w.includes('--auto-install'))).toBe(true)
  })
})

describe('ensureGitFlowAvailable — dryRun', () => {
  test('logs would-install and returns false, no shell-out', () => {
    const result = safeCall({ autoInstall: true, dryRun: true })
    expect(result).toBe(false)
    expect(infos.some((i) => i.includes('would install'))).toBe(true)
    expect(execCalls).toHaveLength(0)
  })
})

describe('ensureGitFlowAvailable — install path', () => {
  test('downloads, verifies checksum, runs installer, returns true', () => {
    const result = safeCall({ autoInstall: true })
    expect(result).toBe(true)
    expect(successes.some((s) => s.includes('git-flow installed'))).toBe(true)
    expect(execCalls.length).toBeGreaterThan(2)
  })

  test('exits 1 on checksum mismatch before running installer', () => {
    digestResult = 'f'.repeat(64)
    safeCall({ autoInstall: true })
    expect(exit).toBe(1)
    expect(errors.some((e) => e.includes('checksum mismatch'))).toBe(true)
    // curl + rm happened, but never the cd/install step.
    expect(
      execCalls.some(
        (c) =>
          c.includes('gitflow-installer.sh') && c.includes('install version')
      )
    ).toBe(false)
  })

  test('warns when install bin not on PATH', () => {
    const savedPath = process.env.PATH
    process.env.PATH = '/usr/bin:/bin'
    const result = safeCall({ autoInstall: true })
    expect(result).toBe(true)
    expect(warns.some((w) => w.includes('not in your PATH'))).toBe(true)
    if (savedPath === undefined) delete process.env.PATH
    else process.env.PATH = savedPath
  })
})
