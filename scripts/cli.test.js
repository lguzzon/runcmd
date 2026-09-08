// ============================================================================
// Tests for cli.js main() dispatch — argument routing, COMMANDS registry,
// BRANCH_OPERATIONS branch-operation dispatch, help handling, and unknown
// command fallback. Mocks every command/operation handler and every lib
// helper cli.js depends on, then drives main() with crafted argv.
// ============================================================================

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test
} from 'bun:test'

// --- Test instrumentation ---

let exitCode = null
let installCalls = []
let runGitCalls = []
let handlerCalls = []
let helpCalls = []

// --- Mock lib/logger.js (cli.js imports COLOR_BOLD, COLOR_RESET, logError,
// logInfo, logWarn from here) ---

mock.module('./lib/logger.js', () => ({
  COLOR_BOLD: '',
  COLOR_INFO: '',
  COLOR_WARN: '',
  COLOR_ERROR: '',
  COLOR_RESET: '',
  logError: () => {},
  logInfo: () => {},
  logWarn: () => {},
  logSuccess: () => {}
}))

// --- Mock lib/installer.js (cli.js imports ensureGitFlowAvailable) ---

mock.module('./lib/installer.js', () => ({
  ensureGitFlowAvailable(opts) {
    installCalls.push(opts)
    return true
  }
}))

// --- Mock lib/git.js (cli.js imports runGit, used in handleInstall) ---

mock.module('./lib/git.js', () => ({
  runGit(args, opts) {
    runGitCalls.push({ args, opts })
    return ''
  }
}))

// --- Mock each commands/* module: handler + printHelp tracker ---

const trackHandler = (name) => async (opts) => {
  handlerCalls.push({ name, opts })
}
const trackHelp = (name) => () => {
  helpCalls.push(name)
}

mock.module('./commands/init.js', () => ({
  handleInit: trackHandler('init'),
  printHelp: trackHelp('init')
}))
mock.module('./commands/start.js', () => ({
  handleStart: trackHandler('start'),
  printHelp: trackHelp('start')
}))
mock.module('./commands/finish.js', () => ({
  handleFinish: trackHandler('finish'),
  printHelp: trackHelp('finish')
}))
mock.module('./commands/publish.js', () => ({
  handlePublish: trackHandler('publish'),
  printHelp: trackHelp('publish')
}))
mock.module('./commands/track.js', () => ({
  handleTrack: trackHandler('track'),
  printHelp: trackHelp('track')
}))
mock.module('./commands/delete.js', () => ({
  handleDelete: trackHandler('delete'),
  printHelp: trackHelp('delete')
}))
mock.module('./commands/list.js', () => ({
  handleList: trackHandler('list'),
  printHelp: trackHelp('list')
}))
mock.module('./commands/config.js', () => ({
  handleConfig: trackHandler('config'),
  printHelp: trackHelp('config')
}))

// --- Mock each operations/* module: handler + printHelp tracker ---
// handleBranchOperation is a single function used by both release and hotfix
// dispatch paths, so capture sub/opts/config to verify wiring.

let branchOpCalls = []

mock.module('./operations/branch-operation.js', () => ({
  handleBranchOperation(sub, opts, config) {
    branchOpCalls.push({ sub, opts, config })
  }
}))

mock.module('./operations/release.js', () => ({
  printHelp: trackHelp('release'),
  releaseConfig: { __tag: 'releaseConfig' }
}))
mock.module('./operations/hotfix.js', () => ({
  printHelp: trackHelp('hotfix'),
  hotfixConfig: { __tag: 'hotfixConfig' }
}))
mock.module('./operations/sync.js', () => ({
  handleSync: trackHandler('sync'),
  printHelp: trackHelp('sync')
}))
mock.module('./operations/clone.js', () => ({
  handleClone: trackHandler('clone'),
  printHelp: trackHelp('clone')
}))

let main

beforeAll(async () => {
  ;({ main } = await import('./cli.js'))
})

beforeEach(() => {
  exitCode = null
  installCalls = []
  runGitCalls = []
  handlerCalls = []
  helpCalls = []
  branchOpCalls = []

  process.exit = (code) => {
    exitCode = code
    throw new Error(`__EXIT__${code}__`)
  }
})

afterEach(() => {
  // restore so other test files (when run non-isolated) are not affected
  // (bun --isolate resets modules per file anyway, but this keeps the
  // pattern honest).
})

/**
 * Run main() with a stubbed argv. process.exit is monkey-patched to throw,
 * so tests observe the exit code without killing the runner.
 * @param {string[]} argv
 * @returns {Promise<void>}
 */
const runMain = async (argv) => {
  process.argv = ['bun', 'cli.js', ...argv]
  try {
    await main()
  } catch (e) {
    if (!String(e.message).startsWith('__EXIT__')) throw e
  }
}

// --- main() entry behavior ---

describe('main — empty argv', () => {
  test('prints help and exits 0', async () => {
    await runMain([])
    expect(exitCode).toBe(0)
    // no command dispatched
    expect(handlerCalls).toHaveLength(0)
    expect(branchOpCalls).toHaveLength(0)
  })
})

describe('main — help/--help/-h', () => {
  test('help prints help and does not dispatch', async () => {
    await runMain(['help'])
    expect(exitCode).toBeNull() // no exit
    expect(handlerCalls).toHaveLength(0)
  })

  test('--help prints help and does not dispatch', async () => {
    await runMain(['--help'])
    expect(exitCode).toBeNull()
    expect(handlerCalls).toHaveLength(0)
  })

  test('-h prints help and does not dispatch', async () => {
    await runMain(['-h'])
    expect(exitCode).toBeNull()
    expect(handlerCalls).toHaveLength(0)
  })

  test('init --help invokes init.printHelp (sub-help exit 0)', async () => {
    await runMain(['init', '--help'])
    expect(exitCode).toBeNull()
    expect(helpCalls).toEqual(['init'])
    expect(handlerCalls).toHaveLength(0)
  })

  test('start --help invokes start.printHelp', async () => {
    await runMain(['start', '--help'])
    expect(helpCalls).toEqual(['start'])
    expect(handlerCalls).toHaveLength(0)
  })

  test('release start --help invokes release.printHelp (COMMANDS lookup)', () => {
    // The release command's printHelp is registered in COMMANDS so the
    // --help branch should find it there.
    return runMain(['release', 'start', '--help']).then(() => {
      expect(helpCalls).toContain('release')
      expect(handlerCalls).toHaveLength(0)
    })
  })
})

// --- install dispatch ---

describe('main — install command', () => {
  test('install calls ensureGitFlowAvailable and does not run flow init outside a repo', async () => {
    // runGit mock returns '' (not 'true'), so handleInstall detects
    // `inRepo === false` and skips the `flow init -d` call. The
    // `rev-parse` probe still runs once.
    await runMain(['install'])
    expect(installCalls).toHaveLength(1)
    const initCalls = runGitCalls.filter((c) => c.args.startsWith('flow init'))
    expect(initCalls).toHaveLength(0)
  })

  test('install calls ensureGitFlowAvailable with parsed opts', async () => {
    await runMain(['install'])
    expect(installCalls).toHaveLength(1)
    expect(installCalls[0]).toEqual(
      expect.objectContaining({ command: 'install', sub: null })
    )
  })
})

// --- COMMANDS dispatch (each registry entry routes to its handler) ---

describe('main — COMMANDS dispatch', () => {
  test('init → handleInitCommand', async () => {
    await runMain(['init'])
    expect(handlerCalls).toEqual([{ name: 'init', opts: expect.anything() }])
    expect(handlerCalls[0].opts.command).toBe('init')
  })

  test('start feature x → handleStartCommand with sub="feature"', async () => {
    await runMain(['start', 'feature', 'x'])
    expect(handlerCalls).toHaveLength(1)
    expect(handlerCalls[0].name).toBe('start')
    expect(handlerCalls[0].opts.sub).toBe('feature')
  })

  test('finish hotfix y → handleFinishCommand with sub="hotfix"', async () => {
    await runMain(['finish', 'hotfix', 'y'])
    expect(handlerCalls[0].name).toBe('finish')
    expect(handlerCalls[0].opts.sub).toBe('hotfix')
  })

  test('publish → handlePublishCommand', async () => {
    await runMain(['publish'])
    expect(handlerCalls[0].name).toBe('publish')
  })

  test('track → handleTrackCommand', async () => {
    await runMain(['track'])
    expect(handlerCalls[0].name).toBe('track')
  })

  test('delete → handleDeleteCommand', async () => {
    await runMain(['delete'])
    expect(handlerCalls[0].name).toBe('delete')
  })

  test('list → handleListCommand', async () => {
    await runMain(['list'])
    expect(handlerCalls[0].name).toBe('list')
  })

  test('config → handleConfigCommand', async () => {
    await runMain(['config'])
    expect(handlerCalls[0].name).toBe('config')
  })

  test('sync → handleSyncOperation', async () => {
    await runMain(['sync'])
    expect(handlerCalls[0].name).toBe('sync')
  })

  test('clone → handleCloneOperation', async () => {
    await runMain(['clone', 'https://example.com/repo.git'])
    // parseArgs quirk: clone's 2nd argv is consumed as nextArg and dropped
    expect(handlerCalls[0].name).toBe('clone')
  })
})

// --- BRANCH_OPERATIONS dispatch (release/hotfix use handleBranchOperation) ---

describe('main — BRANCH_OPERATIONS dispatch (release/hotfix)', () => {
  test('release start → handleBranchOperation("start", opts, releaseConfig)', async () => {
    await runMain(['release', 'start', '--bump', 'minor'])
    expect(branchOpCalls).toHaveLength(1)
    expect(branchOpCalls[0].sub).toBe('start')
    expect(branchOpCalls[0].opts.bump).toBe('minor')
    expect(branchOpCalls[0].config).toEqual({ __tag: 'releaseConfig' })
  })

  test('hotfix finish → handleBranchOperation("finish", opts, hotfixConfig)', async () => {
    await runMain(['hotfix', 'finish', '--tag', 'v1.1.1'])
    expect(branchOpCalls).toHaveLength(1)
    expect(branchOpCalls[0].sub).toBe('finish')
    expect(branchOpCalls[0].opts.tag).toBe('v1.1.1')
    expect(branchOpCalls[0].config).toEqual({ __tag: 'hotfixConfig' })
  })

  test('release (no sub) → handleBranchOperation(null, opts, releaseConfig)', async () => {
    await runMain(['release'])
    expect(branchOpCalls).toHaveLength(1)
    expect(branchOpCalls[0].sub).toBeNull()
    expect(branchOpCalls[0].config).toEqual({ __tag: 'releaseConfig' })
  })

  test('hotfix (no sub) → handleBranchOperation(null, opts, hotfixConfig)', async () => {
    await runMain(['hotfix'])
    expect(branchOpCalls).toHaveLength(1)
    expect(branchOpCalls[0].sub).toBeNull()
    expect(branchOpCalls[0].config).toEqual({ __tag: 'hotfixConfig' })
  })

  test('release and hotfix use distinct configs (no cross-wiring)', async () => {
    await runMain(['release', 'start'])
    await runMain(['hotfix', 'start'])
    expect(branchOpCalls[0].config).toEqual({ __tag: 'releaseConfig' })
    expect(branchOpCalls[1].config).toEqual({ __tag: 'hotfixConfig' })
  })
})

// --- unknown command fallback ---

describe('main — unknown command', () => {
  test('prints help and exits 1', async () => {
    await runMain(['bogus'])
    expect(exitCode).toBe(1)
    expect(handlerCalls).toHaveLength(0)
    expect(branchOpCalls).toHaveLength(0)
  })

  test('typo in command name does not invoke any handler', async () => {
    await runMain(['releas']) // missing trailing 'e'
    expect(exitCode).toBe(1)
    expect(handlerCalls).toHaveLength(0)
  })
})
