import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import {
  ensureBranchExists,
  ensureBranchMissing,
  ensureCleanTree,
  ensureTagMissing,
  logError,
  logInfo,
  logSuccess,
  logWarn,
  pullBranch,
  runGit,
  runGitFlow
} from '../git-flow.js'
import { CHANGELOG_FILE, appendChangelog } from '../lib/changelog.js'
import { promptText } from '../lib/prompts.js'
import { GuardError } from '../lib/validators.js'
import {
  VERSION_FILE,
  compareVersions,
  incrementVersion,
  readVersion,
  validateVersion
} from '../lib/version.js'

export function updateVersionFile(version, { dryRun }) {
  if (!existsSync(VERSION_FILE)) {
    logError(`version.txt not found at ${VERSION_FILE}`)
    throw new GuardError(`version.txt not found at ${VERSION_FILE}`)
  }
  const lines = readFileSync(VERSION_FILE, 'utf-8').split('\n')
  lines[0] = version
  const nextContent = lines.join('\n')
  if (dryRun) {
    logInfo(`[dry-run] would write version.txt => ${version}`)
    return false
  }
  writeFileSync(VERSION_FILE, nextContent, 'utf-8')
  return true
}

export function commitChanges(version, type, { dryRun }) {
  const message = `chore: bump version to ${version} for ${type}`
  runGit(
    `add ${VERSION_FILE}${existsSync(CHANGELOG_FILE) ? ` ${CHANGELOG_FILE}` : ''}`,
    {
      dryRun
    }
  )
  runGit(`commit -m "${message}"`, { dryRun })
}

export async function promptVersion(currentVersion, opts) {
  if (opts.version) {
    if (!validateVersion(opts.version)) {
      logError('--version must be semver x.y.z')
      throw new GuardError('--version must be semver x.y.z')
    }
    return opts.version
  }
  const bumped = incrementVersion(currentVersion, opts.bump)
  if (opts.yes) return bumped
  const answer = await promptText(`Use version ${bumped}? [Y/n] `)
  if (!answer || answer.toLowerCase().startsWith('y')) return bumped
  const custom = await promptText('Enter custom version (x.y.z): ')
  if (!validateVersion(custom)) {
    logError('Invalid version format')
    throw new GuardError('Invalid version format')
  }
  return custom
}

/**
 * Resolve the user-supplied branch name to its canonical form, prepending `v`
 * if missing. `null`/`undefined`/empty name falls back to `fallback` as-is
 * (caller is responsible for supplying a properly-prefixed value such as a
 * version tag `v1.2.0`).
 *
 * @param {string|undefined|null} name raw --name value
 * @param {string} fallback pre-prefixed value used when name is empty
 * @returns {string} canonical name with `v` prefix
 */
export function normalizeBranchName(name, fallback) {
  if (name) return name.startsWith('v') ? name : `v${name}`
  return fallback
}

/**
 * Build the full branch name (`<prefix><name>`) for start/finish. Falls back
 * to `fallback` (a pre-prefixed value supplied by the caller, such as a
 * version tag `v1.2.0`) when the user did not pass `--name`.
 *
 * @param {string|undefined|null} name raw --name value
 * @param {string} fallback pre-prefixed value (version `v1.2.0` for start,
 *   tag for finish) used when name is empty
 * @param {string} prefix branch prefix (e.g. `release/`, `hotfix/`)
 * @returns {string} full branch name
 */
export function buildBranchName(name, fallback, prefix) {
  return `${prefix}${normalizeBranchName(name, fallback)}`
}

/**
 * Assemble the git-flow finish command string from the resolved flags.
 * Pure: no I/O, no env lookup. `-p` only included when push is on and
 * offline is false. `-T` and `-m` always included when their arg is set.
 *
 * @param {{ typeLabel: string, name: string, tag?: string, message?: string, push?: boolean, offline?: boolean }} args
 * @returns {string} command string suitable for `runGitFlow`
 */
export function buildFinishCommand({
  typeLabel,
  name,
  tag,
  message,
  push,
  offline
}) {
  const flags = []
  if (push && !offline) flags.push('-p')
  if (tag) flags.push(`-T ${tag}`)
  if (message) flags.push(`-m "${message}"`)
  const cmdName = name
  return `${typeLabel} finish ${flags.join(' ')} ${cmdName}`
}

export async function handleStart(config, opts) {
  const { defaultBump, defaultBase, prefix, typeLabel } = config
  ensureCleanTree()
  ensureBranchExists(defaultBase)

  const currentVersion = readVersion()
  let { name, bump, version, base, push, noChangelog, dryRun, offline, yes } =
    opts

  const newVersion = await promptVersion(currentVersion, {
    version,
    bump: bump || defaultBump,
    yes
  })

  if (!validateVersion(newVersion)) {
    logError('Invalid version format')
    throw new GuardError('Invalid version format')
  }

  if (compareVersions(newVersion, currentVersion) < 0) {
    logError(
      `New version ${newVersion} cannot be lower than current ${currentVersion}`
    )
    throw new GuardError(
      `New version ${newVersion} cannot be lower than current ${currentVersion}`
    )
  }

  const branchName = buildBranchName(name, `v${newVersion}`, prefix)
  ensureBranchMissing(branchName)

  const baseBranch = base || defaultBase
  if (!offline) {
    pullBranch(baseBranch, { dryRun, offline })
  }

  logInfo(`Starting ${typeLabel} branch: ${branchName}`)
  const releaseName = normalizeBranchName(name, `v${newVersion}`)
  runGitFlow(`${typeLabel} start ${releaseName} ${baseBranch}`, { dryRun })
  logSuccess(
    `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} branch started: ${branchName}`
  )

  const versionChanged = updateVersionFile(newVersion, { dryRun })
  let changelogChanged = false
  if (!noChangelog) {
    changelogChanged = appendChangelog(newVersion, { dryRun })
  }

  commitChanges(newVersion, typeLabel, { dryRun })

  if (push) {
    runGit(`push -u origin ${branchName}`, { dryRun })
    logSuccess(`Pushed ${branchName}`)
  }

  logSuccess(
    `${
      typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)
    } initialized: ${branchName} (version ${newVersion})`
  )
  if (dryRun) {
    logWarn('Dry-run completed. No changes were applied.')
  } else {
    if (!versionChanged && !changelogChanged) {
      logWarn('No files were changed (version/changelog). Check your inputs.')
    }
  }
}

export async function handleFinish(config, opts) {
  const { prefix, typeLabel } = config

  ensureCleanTree()
  ensureBranchExists('main')
  ensureBranchExists('develop')

  let { name, tag, message, push, keepBranch, dryRun, offline } = opts

  if (!tag || !message) {
    logError(`--tag and --message are required for ${typeLabel} finish`)
    throw new GuardError(
      `--tag and --message are required for ${typeLabel} finish`
    )
  }

  ensureTagMissing(tag)

  const branchName = buildBranchName(name, tag, prefix)
  ensureBranchExists(branchName)

  if (!offline) {
    pullBranch(branchName, { dryRun, offline })
    pullBranch('develop', { dryRun, offline })
    pullBranch('main', { dryRun, offline })
  }

  const cmdName = normalizeBranchName(name, tag)
  const cmd = buildFinishCommand({
    typeLabel,
    name: cmdName,
    tag,
    message,
    push,
    offline
  })
  logInfo(`Finishing ${typeLabel} branch: ${branchName}`)
  runGitFlow(cmd, { dryRun })
  logSuccess(
    `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} branch finalized: ${branchName}`
  )

  if (push && offline) {
    logWarn('--push ignored in offline mode')
  }

  if (!keepBranch && !dryRun) {
    const deleteFlag = opts.force ? '-D' : '-d'
    runGit(`branch ${deleteFlag} ${branchName}`, { allowFail: true })
  }

  logSuccess(
    `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} completed: ${tag}`
  )
}
