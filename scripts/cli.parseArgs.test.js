// ============================================================================
// Tests for cli.js parseArgs — argv parsing, positional resolution, subcommand
// slot detection, flag handling, and --help propagation.
//
// These tests document the actual behavior of parseArgs including the
// known quirks: any 2nd argv is consumed unconditionally as `nextArg` (so
// flags that live in the 2nd slot get dropped unless the subcommand-slot
// block re-inserts them), the `--list` collision guard with the `list`
// command, and the positional default branch that fills cloneUrl/targetDir
// before any type whitelist check.
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
// subcommand slot detection (start/finish/publish/track/delete and
// release/hotfix — the seven commands that take a "sub" positional slot)
// ============================================================================

describe('parseArgs — subcommand slot detection', () => {
  test('start feature new-auth → sub="feature", positional "new-auth" → cloneUrl', () => {
    // The 2nd arg "feature" is consumed as the subcommand slot. The 3rd arg
    // "new-auth" reaches the default branch and fills cloneUrl (not name,
    // not type) because cloneUrl is the first positional default slot.
    const opts = parseArgs(['start', 'feature', 'new-auth'])
    expect(opts.command).toBe('start')
    expect(opts.sub).toBe('feature')
    expect(opts.cloneUrl).toBe('new-auth')
    expect(opts.type).toBeUndefined()
    expect(opts.name).toBeUndefined()
  })

  test('finish release v1.2.0 → sub="release", positional "v1.2.0" → cloneUrl', () => {
    const opts = parseArgs(['finish', 'release', 'v1.2.0'])
    expect(opts.command).toBe('finish')
    expect(opts.sub).toBe('release')
    expect(opts.cloneUrl).toBe('v1.2.0')
  })

  test('publish hotfix urgent → sub captured', () => {
    const opts = parseArgs(['publish', 'hotfix', 'urgent'])
    expect(opts.sub).toBe('hotfix')
    expect(opts.cloneUrl).toBe('urgent')
  })

  test('track support legacy → sub captured', () => {
    const opts = parseArgs(['track', 'support', 'legacy'])
    expect(opts.sub).toBe('support')
    expect(opts.cloneUrl).toBe('legacy')
  })

  test('delete feature old → sub captured', () => {
    const opts = parseArgs(['delete', 'feature', 'old'])
    expect(opts.sub).toBe('feature')
    expect(opts.cloneUrl).toBe('old')
  })

  test('start with --name flag → sub=null, name set', () => {
    // No positional after start, so sub stays null. --name consumes its
    // own value because it lives in the switch loop, not as nextArg.
    const opts = parseArgs(['start', '--name', 'lonely'])
    expect(opts.command).toBe('start')
    expect(opts.sub).toBeNull()
    expect(opts.name).toBe('lonely')
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
// positional capture for clone (and the well-known parsing quirk where the
// 2nd argv is unconditionally consumed as `nextArg` and dropped for any
// command that is not in the subcommand-slot list)
// ============================================================================

describe('parseArgs — clone positional capture', () => {
  test('clone with one positional → cloneUrl set', () => {
    // clone is not in the subcommand-slot list, so its 2nd argv
    // ("https://...") is consumed by nextArg and dropped; the 3rd argv
    // ("mydir") reaches the default branch and fills cloneUrl. This
    // documents the existing behavior.
    const opts = parseArgs(['clone', 'https://example.com/repo.git', 'mydir'])
    expect(opts.command).toBe('clone')
    expect(opts.cloneUrl).toBe('mydir')
  })

  test('clone with single positional → cloneUrl set, targetDir undefined', () => {
    const opts = parseArgs(['clone', 'https://example.com/repo.git'])
    expect(opts.command).toBe('clone')
    // The URL is consumed by nextArg, so the only arg reaching the
    // default branch is nothing — cloneUrl stays undefined.
    expect(opts.cloneUrl).toBeUndefined()
    expect(opts.targetDir).toBeUndefined()
  })
})

// ============================================================================
// positional capture for branch commands (type → name fallback)
// ============================================================================

describe('parseArgs — positional default branch (cloneUrl/targetDir/type/name)', () => {
  test('finish hotfix with three positionals → cloneUrl/targetDir/name, NOT type', () => {
    // finish IS a subcommand-slot command, so its 2nd argv becomes sub.
    // The remaining positionals reach the default branch: cloneUrl fills
    // first, then targetDir, then type (whitelist), then name. The
    // whitelist never matches because the first two slots gobble it.
    const opts = parseArgs(['finish', 'hotfix', 'name1', 'name2', 'name3'])
    expect(opts.sub).toBe('hotfix')
    expect(opts.cloneUrl).toBe('name1')
    expect(opts.targetDir).toBe('name2')
    expect(opts.name).toBe('name3')
    expect(opts.type).toBeUndefined()
  })
})

// ============================================================================
// config command — --get and --set
// ============================================================================

describe('parseArgs — config command', () => {
  test('config --get key (2nd-slot flag is consumed as nextArg, drops --get)', () => {
    // The 2nd argv is unconditionally consumed as `nextArg`. For commands
    // NOT in the subcommand-slot list (config is not), the only way for
    // the flag to survive is to be re-inserted via args.unshift, which
    // only happens for --help/-h. So `config --get key` loses --get.
    // This documents existing behavior; the main() dispatch path
    // overrides --get via COMMANDS.config → handleConfigCommand directly.
    const opts = parseArgs(['config', '--get', 'gitflow.branch.master'])
    expect(opts.command).toBe('config')
    expect(opts.get).toBeUndefined()
    expect(opts.cloneUrl).toBe('gitflow.branch.master')
  })

  test('config --set foo bar → set is undefined (flag dropped by nextArg)', () => {
    // Same quirk: --set lives in the 2nd slot for `config` and is
    // silently consumed. The two value args then reach the default branch.
    const opts = parseArgs(['config', '--set', 'foo', 'bar'])
    expect(opts.command).toBe('config')
    expect(opts.set).toBeUndefined()
    expect(opts.cloneUrl).toBe('foo')
    expect(opts.targetDir).toBe('bar')
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
    expect(opts.sub).toBe('feature')
    expect(opts.cloneUrl).toBe('x')
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
    // finish + hotfix consume the first two slots. The remaining four
    // positionals go through the default branch: name1 → cloneUrl,
    // name2 → targetDir, name3 → name, name4 → unknown (logWarn).
    const opts = parseArgs([
      'finish',
      'hotfix',
      'name1',
      'name2',
      'name3',
      'name4'
    ])
    expect(warnMessages).toEqual(['Ignoring unknown argument: name4'])
    expect(opts.sub).toBe('hotfix')
    expect(opts.cloneUrl).toBe('name1')
    expect(opts.targetDir).toBe('name2')
    expect(opts.name).toBe('name3')
  })
})
