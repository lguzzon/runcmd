import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test'

let parseArgs
let originalExit

beforeAll(async () => {
  ;({ parseArgs } = await import('./git-flow.js'))
})

beforeEach(() => {
  originalExit = process.exit
  process.exit = (code) => {
    throw new Error(`__EXIT__${code}__`)
  }
})

afterEach(() => {
  process.exit = originalExit
})

/**
 * Run parseArgs without letting process.exit kill the test process.
 * @param {string[]} argv
 * @returns {{ opts: any, exit: number | null }}
 */
const safeParse = (argv) => {
  try {
    return { opts: parseArgs(argv), exit: null }
  } catch (e) {
    if (String(e.message).startsWith('__EXIT__')) {
      const code = Number(e.message.replace('__EXIT__', '').replace('__', ''))
      return { opts: null, exit: code }
    }
    throw e
  }
}

describe('parseArgs — command and sub detection', () => {
  test('release start captures command="release" and sub="start"', () => {
    const { opts } = safeParse(['release', 'start', '--bump', 'minor'])
    expect(opts.command).toBe('release')
    expect(opts.sub).toBe('start')
    expect(opts.bump).toBe('minor')
  })

  test('hotfix finish captures command="hotfix" and sub="finish"', () => {
    const { opts } = safeParse(['hotfix', 'finish', '--tag', 'v1.1.1'])
    expect(opts.command).toBe('hotfix')
    expect(opts.sub).toBe('finish')
    expect(opts.tag).toBe('v1.1.1')
  })

  test('finish feature — "feature" is captured as sub', () => {
    const { opts } = safeParse(['finish', 'feature', 'foo'])
    expect(opts.command).toBe('finish')
    expect(opts.sub).toBe('feature')
    expect(opts.cloneUrl).toBe('foo')
  })

  test('publish hotfix — both positional slots consumed', () => {
    const { opts } = safeParse(['publish', 'hotfix', 'fix'])
    expect(opts.command).toBe('publish')
    expect(opts.sub).toBe('hotfix')
    expect(opts.cloneUrl).toBe('fix')
  })

  test('track support — both positional slots consumed', () => {
    const { opts } = safeParse(['track', 'support', 'v1'])
    expect(opts.command).toBe('track')
    expect(opts.sub).toBe('support')
    expect(opts.cloneUrl).toBe('v1')
  })

  test('delete feature — both positional slots consumed', () => {
    const { opts } = safeParse(['delete', 'feature', 'old'])
    expect(opts.command).toBe('delete')
    expect(opts.sub).toBe('feature')
    expect(opts.cloneUrl).toBe('old')
  })

  test('start with only --help has sub=null', () => {
    const { opts } = safeParse(['start', '--help'])
    expect(opts.command).toBe('start')
    expect(opts.sub).toBeNull()
    expect(opts.help).toBe(true)
  })

  test('non-sub-detect commands (init, list, sync, config, install) leave sub=null', () => {
    for (const cmd of ['init', 'list', 'sync', 'config', 'install']) {
      const { opts } = safeParse([cmd])
      expect(opts.command).toBe(cmd)
      expect(opts.sub).toBeNull()
    }
  })

  test('clone command (not in sub-detect list) — second arg is consumed as nextArg and dropped', () => {
    // pre-existing quirk: clone is not in the sub-detect list, but parseArgs
    // still shifts the second argv element into nextArg and discards it.
    const { opts } = safeParse(['clone', 'https://example.com/repo.git'])
    expect(opts.command).toBe('clone')
    expect(opts.sub).toBeNull()
    expect(opts.cloneUrl).toBeUndefined()
  })

  test('clone with three args — first two consumed as nextArg+arg, third becomes cloneUrl', () => {
    const { opts } = safeParse([
      'clone',
      'https://example.com/repo.git',
      'mydir'
    ])
    expect(opts.command).toBe('clone')
    expect(opts.sub).toBeNull()
    expect(opts.cloneUrl).toBe('mydir')
    expect(opts.targetDir).toBeUndefined()
  })
})

describe('parseArgs — help handling', () => {
  test('release --help (no sub) sets opts.help via unshift path', () => {
    const { opts } = safeParse(['release', '--help'])
    expect(opts.command).toBe('release')
    expect(opts.sub).toBeNull()
    expect(opts.help).toBe(true)
  })

  test('hotfix -h sets opts.help', () => {
    const { opts } = safeParse(['hotfix', '-h'])
    expect(opts.command).toBe('hotfix')
    expect(opts.help).toBe(true)
  })

  test('init --help sets opts.help (not in sub-detect list)', () => {
    const { opts } = safeParse(['init', '--help'])
    expect(opts.command).toBe('init')
    expect(opts.help).toBe(true)
  })

  test('start --help sets opts.help and sub=null', () => {
    const { opts } = safeParse(['start', '--help'])
    expect(opts.command).toBe('start')
    expect(opts.sub).toBeNull()
    expect(opts.help).toBe(true)
  })

  test('release start --help captures sub="start" and sets opts.help', () => {
    const { opts } = safeParse(['release', 'start', '--help'])
    expect(opts.command).toBe('release')
    expect(opts.sub).toBe('start')
    expect(opts.help).toBe(true)
  })
})

describe('parseArgs — flag-to-opt mapping (use release start prefix so flags reach the case statement)', () => {
  test('--name consumes next arg', () => {
    const { opts } = safeParse(['release', 'start', '--name', 'myname'])
    expect(opts.name).toBe('myname')
  })

  test('--base consumes next arg', () => {
    const { opts } = safeParse(['release', 'start', '--base', 'main'])
    expect(opts.base).toBe('main')
  })

  test('--force sets opts.force=true', () => {
    const { opts } = safeParse(['release', 'start', '--force'])
    expect(opts.force).toBe(true)
  })

  test('-f alias sets opts.force=true', () => {
    const { opts } = safeParse(['release', 'start', '-f'])
    expect(opts.force).toBe(true)
  })

  test('--tag consumes next arg', () => {
    const { opts } = safeParse(['release', 'finish', '--tag', 'v1.2.3'])
    expect(opts.tag).toBe('v1.2.3')
  })

  test('--message consumes next arg', () => {
    const { opts } = safeParse(['release', 'finish', '--message', 'fix bug'])
    expect(opts.message).toBe('fix bug')
  })

  test('--push sets opts.push=true', () => {
    const { opts } = safeParse(['release', 'finish', '--push'])
    expect(opts.push).toBe(true)
  })

  test('--keep-branch sets opts.keepBranch=true', () => {
    const { opts } = safeParse(['release', 'finish', '--keep-branch'])
    expect(opts.keepBranch).toBe(true)
  })

  test('--offline sets opts.offline=true', () => {
    const { opts } = safeParse(['release', 'start', '--offline'])
    expect(opts.offline).toBe(true)
  })

  test('--dry-run sets opts.dryRun=true', () => {
    const { opts } = safeParse(['release', 'start', '--dry-run'])
    expect(opts.dryRun).toBe(true)
  })

  test('--auto-install sets opts.autoInstall=true', () => {
    const { opts } = safeParse(['release', 'start', '--auto-install'])
    expect(opts.autoInstall).toBe(true)
  })

  test('--type consumes next arg', () => {
    const { opts } = safeParse(['release', 'start', '--type', 'feature'])
    expect(opts.type).toBe('feature')
  })

  test('--bump consumes next arg', () => {
    const { opts } = safeParse(['release', 'start', '--bump', 'major'])
    expect(opts.bump).toBe('major')
  })

  test('--version consumes next arg', () => {
    const { opts } = safeParse(['release', 'start', '--version', '2.0.0'])
    expect(opts.version).toBe('2.0.0')
  })

  test('--fetch sets opts.fetch=true', () => {
    const { opts } = safeParse(['release', 'start', '--fetch'])
    expect(opts.fetch).toBe(true)
  })

  test('--squash sets opts.squash=true', () => {
    const { opts } = safeParse(['release', 'finish', '--squash'])
    expect(opts.squash).toBe(true)
  })

  test('--no-changelog sets opts.noChangelog=true', () => {
    const { opts } = safeParse(['release', 'finish', '--no-changelog'])
    expect(opts.noChangelog).toBe(true)
  })

  test('--yes sets opts.yes=true', () => {
    const { opts } = safeParse(['release', 'start', '--yes'])
    expect(opts.yes).toBe(true)
  })

  test('--get consumes next arg', () => {
    const { opts } = safeParse(['release', 'start', '--get', 'master.branch'])
    expect(opts.get).toBe('master.branch')
  })

  test('--set consumes two args into array', () => {
    const { opts } = safeParse(['release', 'start', '--set', 'foo.bar', 'baz'])
    expect(opts.set).toEqual(['foo.bar', 'baz'])
  })

  test('--list (when command != "list") sets opts.list=true', () => {
    const { opts } = safeParse(['release', 'start', '--list'])
    expect(opts.command).toBe('release')
    expect(opts.list).toBe(true)
  })
})

describe('parseArgs — combined flag scenario (all flags at once)', () => {
  test('every supported flag maps correctly', () => {
    const { opts } = safeParse([
      'hotfix',
      'start',
      '--bump',
      'patch',
      '--name',
      'fix',
      '--base',
      'main',
      '--force',
      '--push',
      '--keep-branch',
      '--offline',
      '--dry-run',
      '--fetch',
      '--squash',
      '--no-changelog',
      '--yes',
      '--version',
      '1.2.3',
      '--type',
      'hotfix'
    ])
    expect(opts.command).toBe('hotfix')
    expect(opts.sub).toBe('start')
    expect(opts.name).toBe('fix')
    expect(opts.base).toBe('main')
    expect(opts.force).toBe(true)
    expect(opts.push).toBe(true)
    expect(opts.keepBranch).toBe(true)
    expect(opts.offline).toBe(true)
    expect(opts.dryRun).toBe(true)
    expect(opts.fetch).toBe(true)
    expect(opts.squash).toBe(true)
    expect(opts.noChangelog).toBe(true)
    expect(opts.yes).toBe(true)
    expect(opts.version).toBe('1.2.3')
    expect(opts.type).toBe('hotfix')
    expect(opts.bump).toBe('patch')
  })
})

describe('parseArgs — positional fallback for non-sub-detect commands', () => {
  test('start with positional fallback when no sub is provided (cloneUrl path)', () => {
    // `start foo` — start is in sub-detect, so 'foo' becomes sub
    const { opts } = safeParse(['start', 'foo'])
    expect(opts.command).toBe('start')
    expect(opts.sub).toBe('foo')
  })

  test('hotfix start with three positionals: sub then cloneUrl then targetDir', () => {
    const { opts } = safeParse(['hotfix', 'start', 'a', 'b', 'c'])
    expect(opts.command).toBe('hotfix')
    expect(opts.sub).toBe('start')
    expect(opts.cloneUrl).toBe('a')
    expect(opts.targetDir).toBe('b')
    // 'c' triggers the warn-and-ignore branch
  })
})

describe('parseArgs — required value errors', () => {
  test('--name without value exits 1 (when reached as a flag)', () => {
    const { exit } = safeParse(['release', 'start', '--name'])
    expect(exit).toBe(1)
  })

  test('--base without value exits 1', () => {
    const { exit } = safeParse(['release', 'start', '--base'])
    expect(exit).toBe(1)
  })

  test('--set with only one value exits 1 (missing second)', () => {
    const { exit } = safeParse(['release', 'start', '--set', 'onlykey'])
    expect(exit).toBe(1)
  })

  test('--set with no value exits 1', () => {
    const { exit } = safeParse(['release', 'start', '--set'])
    expect(exit).toBe(1)
  })

  test('--bump without value exits 1', () => {
    const { exit } = safeParse(['release', 'start', '--bump'])
    expect(exit).toBe(1)
  })

  test('--tag without value exits 1', () => {
    const { exit } = safeParse(['release', 'start', '--tag'])
    expect(exit).toBe(1)
  })

  test('--message without value exits 1', () => {
    const { exit } = safeParse(['release', 'start', '--message'])
    expect(exit).toBe(1)
  })

  test('--get without value exits 1', () => {
    const { exit } = safeParse(['release', 'start', '--get'])
    expect(exit).toBe(1)
  })
})

describe('parseArgs — default values and empty input', () => {
  test('empty argv — command is undefined, sub is null, defaults applied', () => {
    const { opts } = safeParse([])
    expect(opts.command).toBeUndefined()
    expect(opts.sub).toBeNull()
    expect(opts.name).toBeUndefined()
    expect(opts.base).toBeNull()
    expect(opts.force).toBe(false)
    expect(opts.push).toBe(false)
    expect(opts.keepBranch).toBe(false)
    expect(opts.offline).toBe(false)
    expect(opts.dryRun).toBe(false)
    expect(opts.autoInstall).toBe(false)
    expect(opts.fetch).toBe(false)
    expect(opts.squash).toBe(false)
    expect(opts.noChangelog).toBe(false)
    expect(opts.yes).toBe(false)
    expect(opts.list).toBe(false)
  })

  test('only command — flags default to false/undefined', () => {
    const { opts } = safeParse(['init'])
    expect(opts.command).toBe('init')
    expect(opts.help).toBeUndefined()
  })
})

describe('parseArgs — does not mutate caller argv', () => {
  test('input array is copied before mutation', () => {
    const argv = ['release', 'start', '--bump', 'minor']
    const original = [...argv]
    safeParse(argv)
    expect(argv).toEqual(original)
  })
})
