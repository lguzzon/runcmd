// ============================================================================
// Tests for cli.js parseArgs — argv parsing, POSITIONAL_SLOTS mapping,
// subcommand slot detection, flag handling, and --help propagation.
//
// These tests document the actual behavior of parseArgs including the
// known quirks: commands without positional slots consume the 2nd argv
// unconditionally as `nextArg` (so flags that live in the 2nd slot get
// dropped unless the block re-inserts them — see the `config --get key`
// tests), the `--list` collision guard with the `list` command, and the
// default branch that fills cloneUrl/targetDir/type/name from leftover
// positionals.
// ============================================================================

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

// --- Mock lib/logger.js so parseArgs logError/logWarn calls are observable
// and never pollute test output. cli.js imports these by name from logger.js.

const errorMessages = []
const warnMessages = []

mock.module('./lib/logger.js', () => ({
  COLOR_BOLD: '',
  COLOR_INFO: '',
  COLOR_WARN: '',
  COLOR_ERROR: '',
  COLOR_RESET: '',
  logError: (msg) => {
    errorMessages.push(msg)
  },
  logInfo: () => {},
  logWarn: (msg) => {
    warnMessages.push(msg)
  },
  logSuccess: () => {}
}))

// --- Import cli.js AFTER mocking logger so the import picks up the stubs.

const { parseArgs } = await import('./cli.js')

const originalExit = process.exit

beforeEach(() => {
  errorMessages.length = 0
  warnMessages.length = 0
  // parseArgs calls process.exit(1) on missing flag value — convert to
  // a throw so tests can catch the exit code without killing the runner.
  process.exit = (code) => {
    throw new Error(`__EXIT__${code}__`)
  }
})

afterEach(() => {
  process.exit = originalExit
})

// ============================================================================
// defaults
// ============================================================================

describe('parseArgs — defaults', () => {
  test('empty argv returns defaults with command=undefined, sub=null', () => {
    const opts = parseArgs([])
    expect(opts.command).toBeUndefined()
    expect(opts.sub).toBeNull()
    // every boolean flag false, every string flag undefined or null
    expect(opts.name).toBeUndefined()
    expect(opts.base).toBeNull()
    expect(opts.force).toBe(false)
    expect(opts.tag).toBeUndefined()
    expect(opts.message).toBeUndefined()
    expect(opts.push).toBe(false)
    expect(opts.keepBranch).toBe(false)
    expect(opts.offline).toBe(false)
    expect(opts.dryRun).toBe(false)
    expect(opts.autoInstall).toBe(false)
    expect(opts.targetDir).toBeUndefined()
    expect(opts.cloneUrl).toBeUndefined()
    expect(opts.type).toBeUndefined()
    expect(opts.bump).toBeUndefined()
    expect(opts.version).toBeUndefined()
    expect(opts.fetch).toBe(false)
    expect(opts.squash).toBe(false)
    expect(opts.noChangelog).toBe(false)
    expect(opts.yes).toBe(false)
    expect(opts.get).toBeUndefined()
    expect(opts.set).toBeUndefined()
    expect(opts.list).toBe(false)
    expect(opts.help).toBeUndefined()
  })
})

// ============================================================================
// positional slot mapping (start/finish/publish/track/delete take
// <type> <name> positionally; list takes [type]; release/hotfix keep a
// "sub" action slot)
// ============================================================================

describe('parseArgs — positional slot mapping', () => {
  test('start feature new-auth → type="feature", name="new-auth"', () => {
    const opts = parseArgs(['start', 'feature', 'new-auth'])
    expect(opts.command).toBe('start')
    expect(opts.sub).toBeNull()
    expect(opts.type).toBe('feature')
    expect(opts.name).toBe('new-auth')
    expect(opts.cloneUrl).toBeUndefined()
  })

  test('finish release v1.2.0 → type="release", name="v1.2.0"', () => {
    const opts = parseArgs(['finish', 'release', 'v1.2.0'])
    expect(opts.command).toBe('finish')
    expect(opts.sub).toBeNull()
    expect(opts.type).toBe('release')
    expect(opts.name).toBe('v1.2.0')
  })

  test('publish hotfix urgent → type="hotfix", name="urgent"', () => {
    const opts = parseArgs(['publish', 'hotfix', 'urgent'])
    expect(opts.type).toBe('hotfix')
    expect(opts.name).toBe('urgent')
  })

  test('track support legacy → type="support", name="legacy"', () => {
    const opts = parseArgs(['track', 'support', 'legacy'])
    expect(opts.type).toBe('support')
    expect(opts.name).toBe('legacy')
  })

  test('delete feature old → type="feature", name="old"', () => {
    const opts = parseArgs(['delete', 'feature', 'old'])
    expect(opts.type).toBe('feature')
    expect(opts.name).toBe('old')
  })

  test('list feature → type="feature" (list reads opts.type)', () => {
    const opts = parseArgs(['list', 'feature'])
    expect(opts.command).toBe('list')
    expect(opts.type).toBe('feature')
    expect(opts.sub).toBeNull()
  })

  test('start with only a type → name stays undefined', () => {
    const opts = parseArgs(['start', 'feature'])
    expect(opts.type).toBe('feature')
    expect(opts.name).toBeUndefined()
  })

  test('start feature --name lonely → type positional + flag name', () => {
    // The flag stops slot filling, so name comes from the --name flag.
    const opts = parseArgs(['start', 'feature', '--name', 'lonely'])
    expect(opts.type).toBe('feature')
    expect(opts.name).toBe('lonely')
  })

  test('start with --name flag → sub=null, name set', () => {
    // No positional after start, so the slot walk stops on the flag and
    // --name consumes its own value in the flag loop.
    const opts = parseArgs(['start', '--name', 'lonely'])
    expect(opts.command).toBe('start')
    expect(opts.sub).toBeNull()
    expect(opts.name).toBe('lonely')
    expect(opts.type).toBeUndefined()
  })

  test('start --help → sub=null, opts.help=true (help flag re-inserted)', () => {
    const opts = parseArgs(['start', '--help'])
    expect(opts.command).toBe('start')
    expect(opts.sub).toBeNull()
    expect(opts.help).toBe(true)
  })

  test('start -h → sub=null, opts.help=true (help flag re-inserted)', () => {
    const opts = parseArgs(['start', '-h'])
    expect(opts.command).toBe('start')
    expect(opts.sub).toBeNull()
    expect(opts.help).toBe(true)
  })

  test('non-branch command (init) does NOT consume second arg as sub', () => {
    const opts = parseArgs(['init'])
    expect(opts.command).toBe('init')
    expect(opts.sub).toBeNull()
  })

  test('sync --dry-run → dryRun is set (flag in 2nd position)', () => {
    // sync has no positional slots, so its 2nd argv is a flag.
    const opts = parseArgs(['sync', '--dry-run'])
    expect(opts.command).toBe('sync')
    expect(opts.dryRun).toBe(true)
  })

  test('install --auto-install → autoInstall is set', () => {
    const opts = parseArgs(['install', '--auto-install'])
    expect(opts.command).toBe('install')
    expect(opts.autoInstall).toBe(true)
  })
})

// ============================================================================
// release / hotfix — branch-operation commands
// ============================================================================

describe('parseArgs — release/hotfix with flags', () => {
  test('release start --bump minor → sub="start", bump="minor"', () => {
    const opts = parseArgs(['release', 'start', '--bump', 'minor'])
    expect(opts.command).toBe('release')
    expect(opts.sub).toBe('start')
    expect(opts.bump).toBe('minor')
  })

  test('release start --bump major --push', () => {
    const opts = parseArgs(['release', 'start', '--bump', 'major', '--push'])
    expect(opts.sub).toBe('start')
    expect(opts.bump).toBe('major')
    expect(opts.push).toBe(true)
  })

  test('release start --version 1.2.0', () => {
    const opts = parseArgs(['release', 'start', '--version', '1.2.0'])
    expect(opts.sub).toBe('start')
    expect(opts.version).toBe('1.2.0')
  })

  test('release finish --tag v1.2.0 --message msg → sub, tag, message', () => {
    const opts = parseArgs([
      'release',
      'finish',
      '--tag',
      'v1.2.0',
      '--message',
      'msg'
    ])
    expect(opts.sub).toBe('finish')
    expect(opts.tag).toBe('v1.2.0')
    expect(opts.message).toBe('msg')
  })

  test('hotfix start --bump patch --no-changelog', () => {
    const opts = parseArgs([
      'hotfix',
      'start',
      '--bump',
      'patch',
      '--no-changelog'
    ])
    expect(opts.sub).toBe('start')
    expect(opts.bump).toBe('patch')
    expect(opts.noChangelog).toBe(true)
  })

  test('hotfix finish --tag v1.1.1 --message "Hotfix" --push', () => {
    const opts = parseArgs([
      'hotfix',
      'finish',
      '--tag',
      'v1.1.1',
      '--message',
      'Hotfix',
      '--push'
    ])
    expect(opts.sub).toBe('finish')
    expect(opts.tag).toBe('v1.1.1')
    expect(opts.message).toBe('Hotfix')
    expect(opts.push).toBe(true)
  })

  test('release start --base develop --fetch', () => {
    const opts = parseArgs(['release', 'start', '--base', 'develop', '--fetch'])
    expect(opts.sub).toBe('start')
    expect(opts.base).toBe('develop')
    expect(opts.fetch).toBe(true)
  })

  test('release finish --keep-branch --squash', () => {
    const opts = parseArgs(['release', 'finish', '--keep-branch', '--squash'])
    expect(opts.sub).toBe('finish')
    expect(opts.keepBranch).toBe(true)
    expect(opts.squash).toBe(true)
  })

  test('release start --yes (CI bypass)', () => {
    const opts = parseArgs(['release', 'start', '--yes'])
    expect(opts.yes).toBe(true)
  })

  test('release start --dry-run', () => {
    const opts = parseArgs(['release', 'start', '--dry-run'])
    expect(opts.dryRun).toBe(true)
  })

  test('release start -h → opts.help=true (help unshifts back into main loop)', () => {
    const opts = parseArgs(['release', 'start', '-h'])
    expect(opts.command).toBe('release')
    expect(opts.sub).toBe('start')
    expect(opts.help).toBe(true)
  })

  test('release start --help → opts.help=true', () => {
    const opts = parseArgs(['release', 'start', '--help'])
    expect(opts.sub).toBe('start')
    expect(opts.help).toBe(true)
  })

  test('release (no sub) → sub=null', () => {
    const opts = parseArgs(['release'])
    expect(opts.command).toBe('release')
    expect(opts.sub).toBeNull()
  })

  test('hotfix (no sub) → sub=null', () => {
    const opts = parseArgs(['hotfix'])
    expect(opts.command).toBe('hotfix')
    expect(opts.sub).toBeNull()
  })
})

// ============================================================================
// positional capture for clone (cloneUrl then targetDir slots)
// ============================================================================

describe('parseArgs — clone positional capture', () => {
  test('clone <url> <dir> → cloneUrl and targetDir set', () => {
    const opts = parseArgs(['clone', 'https://example.com/repo.git', 'mydir'])
    expect(opts.command).toBe('clone')
    expect(opts.cloneUrl).toBe('https://example.com/repo.git')
    expect(opts.targetDir).toBe('mydir')
  })

  test('clone <url> → cloneUrl set, targetDir undefined', () => {
    const opts = parseArgs(['clone', 'https://example.com/repo.git'])
    expect(opts.command).toBe('clone')
    expect(opts.cloneUrl).toBe('https://example.com/repo.git')
    expect(opts.targetDir).toBeUndefined()
  })

  test('clone <url> --dry-run → flag stops slot walk, url still fills cloneUrl', () => {
    const opts = parseArgs([
      'clone',
      'https://example.com/repo.git',
      '--dry-run'
    ])
    expect(opts.cloneUrl).toBe('https://example.com/repo.git')
    expect(opts.dryRun).toBe(true)
  })
})

// ============================================================================
// positional overflow (leftover positionals after the slots are filled go
// through the default branch: cloneUrl → targetDir → type → name → warn)
// ============================================================================

describe('parseArgs — positional default branch (cloneUrl/targetDir/type/name)', () => {
  test('finish with three positionals → type/name from slots, rest overflow', () => {
    // type and name consume the first two positionals. name2 and name3
    // reach the default branch and fill cloneUrl/targetDir.
    const opts = parseArgs(['finish', 'hotfix', 'name1', 'name2', 'name3'])
    expect(opts.sub).toBeNull()
    expect(opts.type).toBe('hotfix')
    expect(opts.name).toBe('name1')
    expect(opts.cloneUrl).toBe('name2')
    expect(opts.targetDir).toBe('name3')
  })
})

// ============================================================================
// config command — --get and --set
// ============================================================================

describe('parseArgs — config command', () => {
  test('config --get key → get is set', () => {
    // The 2nd argv is re-inserted for commands without positional slots,
    // so the flag reaches the switch.
    const opts = parseArgs(['config', '--get', 'gitflow.branch.master'])
    expect(opts.command).toBe('config')
    expect(opts.get).toBe('gitflow.branch.master')
    expect(opts.cloneUrl).toBeUndefined()
  })

  test('config --set foo bar → set holds both values', () => {
    const opts = parseArgs(['config', '--set', 'foo', 'bar'])
    expect(opts.command).toBe('config')
    expect(opts.set).toEqual(['foo', 'bar'])
    expect(opts.cloneUrl).toBeUndefined()
    expect(opts.targetDir).toBeUndefined()
  })

  test('config x --list (flag in 3rd slot) → list=true', () => {
    // When the flag is past the 2nd slot it reaches the switch and
    // works correctly. This is the workaround: an extra positional
    // before the flag. We do NOT document this as the recommended form.
    const opts = parseArgs(['config', 'x', '--list'])
    expect(opts.command).toBe('config')
    expect(opts.list).toBe(true)
  })
})

// ============================================================================
// list command and --list collision
// ============================================================================

describe('parseArgs — --list flag vs list command', () => {
  test('list (standalone command) → command="list", list=false (collision guard)', () => {
    const opts = parseArgs(['list'])
    expect(opts.command).toBe('list')
    // The --list branch checks `if (opts.command !== 'list')`. With
    // command='list' the guard prevents opts.list from being set.
    expect(opts.list).toBe(false)
  })

  test('list (with --list flag, 2nd-slot flag is dropped) → list=false', () => {
    // --list in the 2nd slot is consumed by nextArg; the switch never
    // sees it. Combined with the collision guard, opts.list stays false.
    const opts = parseArgs(['list', '--list'])
    expect(opts.command).toBe('list')
    expect(opts.list).toBe(false)
  })
})

// ============================================================================
// --help / -h propagation
// ============================================================================

describe('parseArgs — --help / -h propagation', () => {
  test('init --help → opts.help=true (re-inserted by subcommand-slot else branch)', () => {
    const opts = parseArgs(['init', '--help'])
    expect(opts.command).toBe('init')
    expect(opts.help).toBe(true)
  })

  test('finish feature x --help → opts.help=true (help after positionals)', () => {
    const opts = parseArgs(['finish', 'feature', 'x', '--help'])
    expect(opts.type).toBe('feature')
    expect(opts.name).toBe('x')
    expect(opts.help).toBe(true)
  })

  test('start -h → opts.help=true (subcommand short-flag form)', () => {
    const opts = parseArgs(['start', '-h'])
    expect(opts.sub).toBeNull()
    expect(opts.help).toBe(true)
  })

  test('start --help → opts.help=true (subcommand long-flag form)', () => {
    const opts = parseArgs(['start', '--help'])
    expect(opts.sub).toBeNull()
    expect(opts.help).toBe(true)
  })
})

// ============================================================================
// boolean flag set
// ============================================================================

describe('parseArgs — boolean flags', () => {
  test('--force and -f both set force=true (3rd-slot position)', () => {
    // force/-f must live past the 2nd slot to reach the switch.
    expect(parseArgs(['finish', 'feature', 'x', '--force']).force).toBe(true)
    expect(parseArgs(['finish', 'feature', 'x', '-f']).force).toBe(true)
  })

  test('--push, --keep-branch, --offline, --dry-run, --auto-install (3rd-slot+)', () => {
    const opts = parseArgs([
      'release',
      'start',
      '--push',
      '--keep-branch',
      '--offline',
      '--dry-run',
      '--auto-install'
    ])
    expect(opts.push).toBe(true)
    expect(opts.keepBranch).toBe(true)
    expect(opts.offline).toBe(true)
    expect(opts.dryRun).toBe(true)
    expect(opts.autoInstall).toBe(true)
  })

  test('--fetch, --squash, --no-changelog, --yes (3rd-slot+)', () => {
    const opts = parseArgs([
      'release',
      'start',
      '--fetch',
      '--squash',
      '--no-changelog',
      '--yes'
    ])
    expect(opts.fetch).toBe(true)
    expect(opts.squash).toBe(true)
    expect(opts.noChangelog).toBe(true)
    expect(opts.yes).toBe(true)
  })
})

// ============================================================================
// value flags
// ============================================================================

describe('parseArgs — value flags', () => {
  test('--name, --base, --tag, --message, --type, --bump, --version', () => {
    const opts = parseArgs([
      'finish',
      'feature',
      'x',
      '--base',
      'develop',
      '--tag',
      'v1.0.0',
      '--message',
      'ship it',
      '--type',
      'release',
      '--bump',
      'minor',
      '--version',
      '1.2.3'
    ])
    expect(opts.base).toBe('develop')
    expect(opts.tag).toBe('v1.0.0')
    expect(opts.message).toBe('ship it')
    expect(opts.type).toBe('release')
    expect(opts.bump).toBe('minor')
    expect(opts.version).toBe('1.2.3')
  })
})

// ============================================================================
// missing-value and unknown-arg branches
// ============================================================================

describe('parseArgs — missing flag value', () => {
  test('--name with no value → logError + process.exit(1)', () => {
    expect(() => parseArgs(['start', '--name'])).toThrow('__EXIT__1__')
    expect(errorMessages).toEqual(['--name requires a value'])
  })

  test('--bump with no value (after release start) → exits 1', () => {
    expect(() => parseArgs(['release', 'start', '--bump'])).toThrow(
      '__EXIT__1__'
    )
    expect(errorMessages).toEqual(['--bump requires a value'])
  })

  test('--set with only one value (missing value argument) → exits 1', () => {
    // --set reaches the switch (3rd slot, after the 'x' positional); only
    // 'foo' is provided, so the second takeValue('value') call exhausts the
    // queue and fires logError + process.exit. Exit is stubbed to throw.
    expect(() => parseArgs(['config', 'x', '--set', 'foo'])).toThrow(
      '__EXIT__1__'
    )
    expect(errorMessages).toEqual(['value requires a value'])
  })
})

describe('parseArgs — unknown argument', () => {
  test('5th+ positional triggers logWarn and is otherwise ignored', () => {
    // finish consumes type/name via slots. The remaining three
    // positionals go through the default branch: name2 → cloneUrl,
    // name3 → targetDir, name4 and name5 → unknown (logWarn), because
    // type and name are already filled.
    const opts = parseArgs([
      'finish',
      'hotfix',
      'name1',
      'name2',
      'name3',
      'name4',
      'name5'
    ])
    expect(warnMessages).toEqual([
      'Ignoring unknown argument: name4',
      'Ignoring unknown argument: name5'
    ])
    expect(opts.sub).toBeNull()
    expect(opts.type).toBe('hotfix')
    expect(opts.name).toBe('name1')
    expect(opts.cloneUrl).toBe('name2')
    expect(opts.targetDir).toBe('name3')
  })
})
