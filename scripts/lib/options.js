#!/usr/bin/env bun

/**
 * Default options for `release-init.js`.
 * @type {{
 *   type: string,
 *   bump: (string|undefined),
 *   version: (string|undefined),
 *   push: boolean,
 *   dryRun: boolean,
 *   yes: boolean,
 *   noChangelog: boolean,
 *   offline: boolean,
 *   help: boolean
 * }}
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
 * @type {{
 *   type: (string|undefined),
 *   branch: (string|undefined),
 *   push: boolean,
 *   dryRun: boolean,
 *   yes: boolean,
 *   noChangelog: boolean,
 *   keepBranch: boolean,
 *   json: boolean,
 *   offline: boolean,
 *   help: boolean
 * }}
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
 * @param {string[]} argv tokens to parse (process.argv.slice(2) by default)
 * @param {object} defaults starting options object (e.g. releaseInitDefaults)
 * @returns {object} merged options; CI=true is also folded into opts.yes
 */
export function parseFlags(argv, defaults) {
  const opts = { ...defaults }
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
  return opts
}
