#!/usr/bin/env bun

/**
 * Options produced by `parseFlags` when seeded with `releaseInitDefaults`.
 * @typedef {object} ReleaseInitOpts
 * @property {string} type branch type (release/hotfix)
 * @property {string|undefined} bump version bump kind
 * @property {string|undefined} version explicit version
 * @property {boolean} push push new branch+commit
 * @property {boolean} dryRun no side effects
 * @property {boolean} yes non-interactive
 * @property {boolean} noChangelog skip changelog
 * @property {boolean} offline skip remote
 * @property {boolean} help show help
 */

/**
 * Options produced by `parseFlags` when seeded with `releaseFinalizeDefaults`.
 * @typedef {object} ReleaseFinalizeOpts
 * @property {string|undefined} type branch type (release/hotfix)
 * @property {string|undefined} branch branch to finalize
 * @property {boolean} push push branches/tags
 * @property {boolean} dryRun no side effects
 * @property {boolean} yes non-interactive
 * @property {boolean} noChangelog skip changelog
 * @property {boolean} keepBranch do not delete branch
 * @property {boolean} json emit JSON summary
 * @property {boolean} offline skip pulls
 * @property {boolean} help show help
 * @property {string} [name] branch/feature name (set by the finalizer flow)
 * @property {string} [tag] version tag (set by the finalizer flow)
 * @property {string} [message] release message (set by the finalizer flow)
 */

/**
 * Default options for `release-init.js`.
 * @type {ReleaseInitOpts}
 */
export const releaseInitDefaults = {
  type: 'release',
  bump: undefined,
  version: undefined,
  push: false,
  dryRun: false,
  yes: false,
  noChangelog: false,
  offline: false,
  help: false
}

/**
 * Default options for `release-finalize.js`.
 * @type {ReleaseFinalizeOpts}
 */
export const releaseFinalizeDefaults = {
  type: undefined,
  branch: undefined,
  push: false,
  dryRun: false,
  yes: false,
  noChangelog: false,
  keepBranch: false,
  json: false,
  offline: false,
  help: false
}

/**
 * Parse a flat list of `--flag [value]` arguments into an options object.
 * Shared by `release-init.js` and `release-finalize.js` so a new flag only
 * needs to be added in one place. Unknown flags are ignored for backward
 * compatibility. When a flag takes a value, missing the value exits(1).
 *
 * Recognized flags:
 *   --type <s>        --branch <s>   --bump <s>     --version <s>
 *   --push            --dry-run      --yes          --no-changelog
 *   --keep-branch     --json         --offline      --help / -h
 *
 * @template T
 * @param {string[]} argv tokens to parse (process.argv.slice(2) by default)
 * @param {T} defaults starting options object (e.g. releaseInitDefaults)
 * @returns {T & { help?: boolean, yes?: boolean }} merged options; CI=true also folded into opts.yes
 */
export function parseFlags(argv, defaults) {
  /** @type {Record<string, any>} */
  const opts = { .../** @type {Record<string, any>} */ (defaults) }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    switch (arg) {
      case '--type':
        opts.type = argv[++i]
        break
      case '--branch':
        opts.branch = argv[++i]
        break
      case '--bump':
        opts.bump = argv[++i]
        break
      case '--version':
        opts.version = argv[++i]
        break
      case '--push':
        opts.push = true
        break
      case '--dry-run':
        opts.dryRun = true
        break
      case '--yes':
        opts.yes = true
        break
      case '--no-changelog':
        opts.noChangelog = true
        break
      case '--keep-branch':
        opts.keepBranch = true
        break
      case '--json':
        opts.json = true
        break
      case '--offline':
        opts.offline = true
        break
      case '--help':
      case '-h':
        opts.help = true
        break
      default:
        // Ignore unknown arguments for backward compatibility
        break
    }
  }
  if (process.env.CI === 'true') {
    opts.yes = true
  }
  return /** @type {T & { help?: boolean, yes?: boolean }} */ (
    /** @type {any} */ (opts)
  )
}
