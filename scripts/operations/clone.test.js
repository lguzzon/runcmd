// Tests for operations/clone.js handleClone — the only operations workflow
// handler without direct coverage. Mocks ../git-flow.js (hub) which is the
// sole dependency of clone.js.

import { afterEach, beforeAll, describe, expect, mock, test } from 'bun:test'

let exit = 0

process.exit = (code) => {
  exit = code
  throw new Error(`__EXIT__${code}__`)
}

let available = true
let gitCalls = []
let infoOut = []
let consoleOut = []

console.log = (...args) => {
  consoleOut.push(args.join(' '))
}

mock.module('../git-flow.js', () => ({
  COLOR_BOLD: '',
  COLOR_RESET: '',
  ensureGitFlowAvailable() {
    return available
  },
  logError: () => {},
  logInfo: (msg) => {
    infoOut.push(msg)
  },
  logSuccess: () => {},
  runGit(args, opts) {
    gitCalls.push({ args, opts })
    return ''
  }
}))

let clone

beforeAll(async () => {
  clone = await import('./clone.js')
})

afterEach(() => {
  exit = 0
  available = true
  gitCalls = []
  infoOut = []
  consoleOut = []
})

const safeHandle = async (opts) => {
  try {
    await clone.handleClone(opts)
  } catch (e) {
    if (!String(e.message).startsWith('__EXIT__')) throw e
  }
}

describe('handleClone — availability gate', () => {
  test('exits when git-flow is unavailable', async () => {
    available = false
    await safeHandle({ cloneUrl: 'https://x/repo.git' })
    expect(exit).toBe(1)
    expect(gitCalls).toHaveLength(0)
  })
})

describe('handleClone — help', () => {
  test('prints help and returns when opts.help', async () => {
    await safeHandle({ cloneUrl: 'https://x/repo.git', help: true })
    expect(exit).toBe(0)
    expect(gitCalls).toHaveLength(0)
    expect(consoleOut.join(' ')).toContain('Git Flow Clone')
  })
})

describe('handleClone — URL requirement', () => {
  test('exits when cloneUrl missing', async () => {
    await safeHandle({})
    expect(exit).toBe(1)
  })
})

describe('handleClone — dry run', () => {
  test('dryRun logs clone + init commands without running git', async () => {
    await safeHandle({
      cloneUrl: 'https://github.com/user/repo.git',
      dryRun: true
    })
    expect(gitCalls).toHaveLength(0)
    const out = infoOut.join(' ')
    expect(out).toContain('git clone https://github.com/user/repo.git repo')
    expect(out).toContain('git flow init -d')
  })
})

describe('handleClone — target directory derivation', () => {
  test('runs clone with explicit targetDir', async () => {
    await safeHandle({
      cloneUrl: 'https://github.com/user/repo.git',
      targetDir: 'my-repo'
    })
    expect(gitCalls[0].args).toBe(
      'clone https://github.com/user/repo.git my-repo'
    )
  })

  test('defaults target to repo basename with .git stripped', async () => {
    await safeHandle({ cloneUrl: 'https://github.com/user/repo.git' })
    expect(gitCalls[0].args).toBe('clone https://github.com/user/repo.git repo')
  })

  test('falls back to "repo" when basename is empty', async () => {
    await safeHandle({ cloneUrl: 'https://github.com/.git' })
    expect(gitCalls[0].args).toBe('clone https://github.com/.git repo')
  })
})

describe('handleClone — git-flow init in clone', () => {
  test('runs git-flow init inside target after clone', async () => {
    await safeHandle({ cloneUrl: 'https://x/a.git', targetDir: 'd' })
    expect(gitCalls).toHaveLength(2)
    expect(gitCalls[1].args).toBe('-C d flow init -d')
  })
})

describe('clone printHelp', () => {
  test('logs the help banner', () => {
    clone.printHelp()
    expect(consoleOut.join(' ')).toContain('Git Flow Clone')
  })
})
