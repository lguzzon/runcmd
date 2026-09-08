import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'

// ---------------------------------------------------------------------------
// Stub the low-level git module BEFORE importing release-utils so its
// transitive dependency (../git-flow.js -> ../lib/git.js) picks up the
// stubs. Each test installs its own implementation via installRunGit.
// GITFLOW_ROOT must be set before the dynamic import so the module-load-time
// VERSION_FILE / CHANGELOG_FILE constants resolve to the temp dir.
// ---------------------------------------------------------------------------

const gitModulePath = '../lib/git.js'
let runGitImpl = () => ''

mock.module(gitModulePath, () => ({
  runGit: (args, opts = {}) => runGitImpl(args, opts),
  runGitFlow: (args, opts = {}) => runGitImpl(args, opts)
}))

// eslint-disable-next-line import/first
const { mkdtempSync, readFileSync, rmSync, writeFileSync } =
  await import('node:fs')
// eslint-disable-next-line import/first
const { tmpdir } = await import('node:os')
// eslint-disable-next-line import/first
const { join } = await import('node:path')
const dir = mkdtempSync(join(tmpdir(), 'ru-orch-'))
process.env.GITFLOW_ROOT = dir

// eslint-disable-next-line import/first
const { GuardError } = await import('../lib/validators.js')
// eslint-disable-next-line import/first
const ru = await import('./release-utils.js')

const gitCalls = []

function installRunGit(fn) {
  runGitImpl = (args, opts) => {
    gitCalls.push({ args, opts })
    return fn(args, opts)
  }
}

/** Default stub: branch existence checks resolve to "exists" for main/develop
 *  (refs/heads/*) and "absent" for everything else (the release branch we
 *  are about to create), tag list empty, everything else empty string. */
function defaultRunGit(args) {
  if (args.includes('show-ref --verify --quiet refs/heads/main')) return 'abc'
  if (args.includes('show-ref --verify --quiet refs/heads/develop'))
    return 'abc'
  if (args.includes('show-ref --verify --quiet')) return null
  if (args.startsWith('tag --list')) return ''
  return ''
}

afterAll(() => {
  delete process.env.GITFLOW_ROOT
  rmSync(dir, { recursive: true, force: true })
})

beforeEach(() => {
  gitCalls.length = 0
  installRunGit(defaultRunGit)
  writeFileSync(join(dir, 'version.txt'), '1.2.3\n')
  writeFileSync(join(dir, 'CHANGELOG.md'), '# Changelog\n')
})

// ---------------------------------------------------------------------------
// handleStart — orchestration paths
// ---------------------------------------------------------------------------

describe('handleStart orchestration', () => {
  test('throws GuardError when newVersion < currentVersion', async () => {
    await expect(
      ru.handleStart(
        {
          defaultBump: 'patch',
          defaultBase: 'develop',
          prefix: 'release/',
          typeLabel: 'release'
        },
        {
          name: 'v1.2.0',
          version: '0.5.0',
          yes: true,
          offline: true,
          dryRun: false,
          noChangelog: true
        }
      )
    ).rejects.toThrow(GuardError)
  })

  test('falls back to v{newVersion} when --name omitted', async () => {
    await ru.handleStart(
      {
        defaultBump: 'patch',
        defaultBase: 'develop',
        prefix: 'release/',
        typeLabel: 'release'
      },
      {
        name: undefined,
        version: '1.2.3',
        yes: true,
        offline: true,
        dryRun: true,
        noChangelog: true
      }
    )
    // git-flow prepends the prefix itself; command name is unprefixed
    const startCall = gitCalls.find((c) => c.args.includes('release start'))
    expect(startCall).toBeDefined()
    expect(startCall.args).toContain('v1.2.3')
    expect(startCall.args).toContain('develop')
    // ensureBranchMissing() checked the prefixed ref
    expect(
      gitCalls.some((c) =>
        c.args.includes('show-ref --verify --quiet refs/heads/release/v1.2.3')
      )
    ).toBe(true)
  })

  test('start command uses explicit --name (no v) by prepending v', async () => {
    await ru.handleStart(
      {
        defaultBump: 'minor',
        defaultBase: 'develop',
        prefix: 'release/',
        typeLabel: 'release'
      },
      {
        name: 'custom',
        version: '1.3.0',
        yes: true,
        offline: true,
        dryRun: true,
        noChangelog: true
      }
    )
    // git-flow name arg stays unprefixed; ensureBranchMissing checks full ref
    const startCall = gitCalls.find((c) => c.args.includes('release start'))
    expect(startCall).toBeDefined()
    expect(startCall.args).toContain('vcustom')
    expect(
      gitCalls.some((c) =>
        c.args.includes('show-ref --verify --quiet refs/heads/release/vcustom')
      )
    ).toBe(true)
  })

  test('push flag triggers git push -u origin <branch>', async () => {
    await ru.handleStart(
      {
        defaultBump: 'patch',
        defaultBase: 'develop',
        prefix: 'release/',
        typeLabel: 'release'
      },
      {
        name: 'v1.2.0',
        version: '1.2.4',
        yes: true,
        push: true,
        offline: true,
        dryRun: true,
        noChangelog: true
      }
    )
    const pushCall = gitCalls.find((c) => c.args.startsWith('push -u origin'))
    expect(pushCall).toBeDefined()
    expect(pushCall.args).toBe('push -u origin release/v1.2.0')
  })

  test('offline skips pullBranch entirely', async () => {
    await ru.handleStart(
      {
        defaultBump: 'patch',
        defaultBase: 'develop',
        prefix: 'release/',
        typeLabel: 'release'
      },
      {
        name: 'v1.2.0',
        version: '1.2.4',
        yes: true,
        offline: true,
        dryRun: true,
        noChangelog: true
      }
    )
    expect(gitCalls.some((c) => c.args.includes('checkout develop'))).toBe(
      false
    )
    expect(gitCalls.some((c) => c.args.includes('pull'))).toBe(false)
  })

  test('dryRun short-circuits version file write', async () => {
    writeFileSync(join(dir, 'version.txt'), '1.2.3\n')
    await ru.handleStart(
      {
        defaultBump: 'patch',
        defaultBase: 'develop',
        prefix: 'release/',
        typeLabel: 'release'
      },
      {
        name: 'v1.2.0',
        version: '1.2.4',
        yes: true,
        offline: true,
        dryRun: true,
        noChangelog: true
      }
    )
    const content = readFileSync(join(dir, 'version.txt'), 'utf-8').split(
      '\n'
    )[0]
    expect(content).toBe('1.2.3')
  })
})

// ---------------------------------------------------------------------------
// handleFinish — orchestration paths
// ---------------------------------------------------------------------------

describe('handleFinish orchestration', () => {
  test('throws GuardError when --tag missing', async () => {
    await expect(
      ru.handleFinish(
        { prefix: 'release/', typeLabel: 'release' },
        {
          name: 'v1.2.0',
          message: 'm',
          offline: true,
          keepBranch: true
        }
      )
    ).rejects.toThrow(GuardError)
  })

  test('throws GuardError when --message missing', async () => {
    await expect(
      ru.handleFinish(
        { prefix: 'release/', typeLabel: 'release' },
        {
          name: 'v1.2.0',
          tag: 'v1.2.0',
          offline: true,
          keepBranch: true
        }
      )
    ).rejects.toThrow(GuardError)
  })

  test('falls back to tag when --name omitted', async () => {
    installRunGit((args) => {
      if (args.includes('show-ref --verify --quiet refs/heads/main'))
        return 'abc'
      if (args.includes('show-ref --verify --quiet refs/heads/develop'))
        return 'abc'
      if (args.includes('show-ref --verify --quiet refs/heads/release/v1.2.0'))
        return 'abc'
      if (args.startsWith('tag --list')) return ''
      return ''
    })
    await ru.handleFinish(
      { prefix: 'release/', typeLabel: 'release' },
      {
        name: undefined,
        tag: 'v1.2.0',
        message: 'Release 1.2.0',
        offline: true,
        keepBranch: true
      }
    )
    const finishCall = gitCalls.find((c) => c.args.includes('release finish'))
    expect(finishCall).toBeDefined()
    // git-flow name arg stays unprefixed; ensureBranchExists checked full ref
    expect(finishCall.args).toContain('v1.2.0')
  })

  test('offline + push: -p flag dropped from finish command', async () => {
    installRunGit((args) => {
      if (args.includes('show-ref --verify --quiet refs/heads/main'))
        return 'abc'
      if (args.includes('show-ref --verify --quiet refs/heads/develop'))
        return 'abc'
      if (args.includes('show-ref --verify --quiet refs/heads/release/v1.2.0'))
        return 'abc'
      if (args.startsWith('tag --list')) return ''
      return ''
    })
    await ru.handleFinish(
      { prefix: 'release/', typeLabel: 'release' },
      {
        name: 'v1.2.0',
        tag: 'v1.2.0',
        message: 'Release 1.2.0',
        push: true,
        offline: true,
        keepBranch: true
      }
    )
    const finishCall = gitCalls.find((c) => c.args.includes('release finish'))
    expect(finishCall).toBeDefined()
    expect(finishCall.args).not.toContain('-p')
    expect(finishCall.args).toContain('-T v1.2.0')
    expect(finishCall.args).toContain('-m "Release 1.2.0"')
  })

  test('offline + push: -p flag present in command (offline=false)', async () => {
    installRunGit((args) => {
      if (args.includes('show-ref --verify --quiet refs/heads/main'))
        return 'abc'
      if (args.includes('show-ref --verify --quiet refs/heads/develop'))
        return 'abc'
      if (args.includes('show-ref --verify --quiet refs/heads/release/v1.2.0'))
        return 'abc'
      if (args.startsWith('tag --list')) return ''
      return ''
    })
    await ru.handleFinish(
      { prefix: 'release/', typeLabel: 'release' },
      {
        name: 'v1.2.0',
        tag: 'v1.2.0',
        message: 'Release 1.2.0',
        push: true,
        offline: false,
        dryRun: true,
        keepBranch: true
      }
    )
    const finishCall = gitCalls.find((c) => c.args.includes('release finish'))
    expect(finishCall).toBeDefined()
    expect(finishCall.args).toContain('-p')
  })

  test('keepBranch=false + dryRun=true: branch delete is skipped', async () => {
    installRunGit((args) => {
      if (args.includes('show-ref --verify --quiet refs/heads/main'))
        return 'abc'
      if (args.includes('show-ref --verify --quiet refs/heads/develop'))
        return 'abc'
      if (args.includes('show-ref --verify --quiet refs/heads/release/v1.2.0'))
        return 'abc'
      if (args.startsWith('tag --list')) return ''
      return ''
    })
    await ru.handleFinish(
      { prefix: 'release/', typeLabel: 'release' },
      {
        name: 'v1.2.0',
        tag: 'v1.2.0',
        message: 'Release 1.2.0',
        push: false,
        offline: true,
        dryRun: true,
        keepBranch: false
      }
    )
    expect(
      gitCalls.some(
        (c) => c.args.startsWith('branch -d') || c.args.startsWith('branch -D')
      )
    ).toBe(false)
  })

  test('keepBranch=false + !dryRun: branch -d invoked', async () => {
    installRunGit((args) => {
      if (args.includes('show-ref --verify --quiet refs/heads/main'))
        return 'abc'
      if (args.includes('show-ref --verify --quiet refs/heads/develop'))
        return 'abc'
      if (args.includes('show-ref --verify --quiet refs/heads/release/v1.2.0'))
        return 'abc'
      if (args.startsWith('tag --list')) return ''
      return ''
    })
    await ru.handleFinish(
      { prefix: 'release/', typeLabel: 'release' },
      {
        name: 'v1.2.0',
        tag: 'v1.2.0',
        message: 'Release 1.2.0',
        push: false,
        offline: true,
        dryRun: false,
        keepBranch: false
      }
    )
    const delCall = gitCalls.find((c) => c.args.startsWith('branch -d'))
    expect(delCall).toBeDefined()
    expect(delCall.args).toBe('branch -d release/v1.2.0')
    expect(delCall.opts.allowFail).toBe(true)
  })

  test('keepBranch=false + force: branch -D invoked (uppercase)', async () => {
    installRunGit((args) => {
      if (args.includes('show-ref --verify --quiet refs/heads/main'))
        return 'abc'
      if (args.includes('show-ref --verify --quiet refs/heads/develop'))
        return 'abc'
      if (args.includes('show-ref --verify --quiet refs/heads/release/v1.2.0'))
        return 'abc'
      if (args.startsWith('tag --list')) return ''
      return ''
    })
    await ru.handleFinish(
      { prefix: 'release/', typeLabel: 'release' },
      {
        name: 'v1.2.0',
        tag: 'v1.2.0',
        message: 'Release 1.2.0',
        push: false,
        offline: true,
        dryRun: false,
        keepBranch: false,
        force: true
      }
    )
    const delCall = gitCalls.find((c) => c.args.startsWith('branch -D'))
    expect(delCall).toBeDefined()
    expect(delCall.args).toBe('branch -D release/v1.2.0')
  })
})
