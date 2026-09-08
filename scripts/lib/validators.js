import { logError } from './logger.js'
import { runGit } from './git.js'

/**
 * Thrown by guard helpers (`ensureCleanTree`, `ensureBranchExists`, ...)
 * when a precondition fails. The CLI dispatch layer logs the message and
 * exits with code 1; tests can assert on `instanceof GuardError` without
 * monkey-patching `process.exit`.
 */
export class GuardError extends Error {
  constructor(message) {
    super(message)
    this.name = 'GuardError'
  }
}

export function ensureCleanTree() {
  const status = runGit('status --porcelain', { allowFail: true })
  if (status && status.length > 0) {
    logError('Uncommitted changes detected. Please commit or stash them first.')
    throw new GuardError('Uncommitted changes detected')
  }
}

export function ensureBranchExists(name) {
  const res = runGit(`show-ref --verify --quiet refs/heads/${name}`, {
    allowFail: true
  })
  if (res === null) {
    logError(`Required branch '${name}' not found.`)
    throw new GuardError(`Required branch '${name}' not found`)
  }
}

export function ensureBranchMissing(name) {
  const exists = runGit(`show-ref --verify --quiet refs/heads/${name}`, {
    allowFail: true
  })
  if (exists !== null) {
    logError(`Branch '${name}' already exists.`)
    throw new GuardError(`Branch '${name}' already exists`)
  }
}

export function detectMainBranch(remote = 'origin') {
  const hasMain = runGit(`ls-remote --exit-code --heads ${remote} main`, {
    allowFail: true
  })
  if (hasMain !== null) return 'main'
  const hasMaster = runGit(`ls-remote --exit-code --heads ${remote} master`, {
    allowFail: true
  })
  if (hasMaster !== null) return 'master'
  return 'main'
}

export function checkout(branch, opts = {}) {
  return runGit(`checkout ${branch}`, opts)
}

export function pullBranch(
  branch,
  { dryRun = false, offline = false, allowFail = true } = {}
) {
  if (offline) return
  checkout(branch, { dryRun })
  runGit(`pull --ff-only origin ${branch}`, { dryRun, allowFail })
}

export function pushBranch(branch, opts = {}) {
  return runGit(`push origin ${branch}`, { ...opts, allowFail: true })
}

export function mergeBranch(source, target, opts = {}) {
  checkout(target, opts)
  const res = runGit(`merge ${source} --no-ff --no-edit`, {
    ...opts,
    allowFail: true,
    pipeStdout: true
  })
  if (res === null && !opts.dryRun) {
    logError(
      `Merge of ${source} into ${target} failed. Resolve conflicts and retry.`
    )
    throw new GuardError(
      `Merge of ${source} into ${target} failed. Resolve conflicts and retry.`
    )
  }
}

export function stashPush(message = 'auto-stash') {
  return runGit(`stash push -m "${message}"`, { allowFail: true })
}

export function stashPop() {
  return runGit('stash pop', { allowFail: true })
}

export function currentBranch() {
  const name = runGit('rev-parse --abbrev-ref HEAD', { allowFail: true })
  return name || ''
}

export function ensureTagMissing(version) {
  // Normalize: strip leading 'v' then compare against v-prefixed tag list
  const normalizedVersion = version.replace(/^v/, '')
  const tagName = `v${normalizedVersion}`
  const tags = runGit('tag -l', { allowFail: true }) || ''
  if (tags.split('\n').includes(tagName)) {
    logError(`Tag ${tagName} already exists.`)
    throw new GuardError(`Tag ${tagName} already exists`)
  }
}

export function getBranchType(branch) {
  if (!branch) return 'unknown'
  if (branch.startsWith('feature/')) return 'feature'
  if (branch.startsWith('release/')) return 'release'
  if (branch.startsWith('hotfix/')) return 'hotfix'
  if (branch.startsWith('support/')) return 'support'
  if (branch === 'main' || branch === 'master') return 'main'
  if (branch === 'develop') return 'develop'
  return 'unknown'
}

export function validateBranchName(name, type) {
  const patterns = {
    feature: /^[\w-]+$/,
    release: /^[\w-]+$/,
    hotfix: /^[\w-]+$/,
    support: /^[\w-]+$/
  }
  const pattern = patterns[type]
  if (!pattern) {
    logError(`Invalid branch type: ${type}`)
    return false
  }
  if (!pattern.test(name)) {
    logError(
      `Invalid ${type} branch name: ${name}. Use alphanumeric characters, hyphens, and underscores only.`
    )
    return false
  }
  return true
}

export function ensureGitFlowInitialized() {
  const initialized = runGit('config --get gitflow.initialized', {
    allowFail: true
  })
  if (!initialized) {
    logError(
      "Git Flow is not initialized. Run 'git flow init' or 'bun scripts/git-flow.js init' first."
    )
    throw new GuardError('Git Flow is not initialized')
  }
}

/**
 * Read every git-flow config key in a single git invocation.
 *
 * `git config --get-regexp <pattern>` prints `<key> <value>` lines and exits
 * non-zero (no stdout) when nothing matches — we treat that as "use defaults".
 * One spawn replaces the previous six `config --get <key>` forks.
 *
 * @returns {{ master: string, develop: string, featurePrefix: string, releasePrefix: string, hotfixPrefix: string, supportPrefix: string }}
 */
export function getGitFlowConfig() {
  const output = runGit(
    'config --get-regexp ^gitflow\\.(branch\\.(master|develop)|prefix\\.(feature|release|hotfix|support))$',
    { allowFail: true }
  )
  const found = new Map()
  if (output) {
    for (const line of output.split('\n')) {
      const space = line.indexOf(' ')
      if (space === -1) continue
      found.set(line.slice(0, space), line.slice(space + 1))
    }
  }
  return {
    master: found.get('gitflow.branch.master') || 'master',
    develop: found.get('gitflow.branch.develop') || 'develop',
    featurePrefix: found.get('gitflow.prefix.feature') || 'feature/',
    releasePrefix: found.get('gitflow.prefix.release') || 'release/',
    hotfixPrefix: found.get('gitflow.prefix.hotfix') || 'hotfix/',
    supportPrefix: found.get('gitflow.prefix.support') || 'support/'
  }
}

export function listBranchesByType(type) {
  const config = getGitFlowConfig()
  const prefix = config[`${type}Prefix`]
  if (!prefix) {
    logError(`Unknown branch type: ${type}`)
    return []
  }
  const branches = runGit(`branch --list "${prefix}*"`, { allowFail: true })
  if (!branches) return []
  return branches
    .split('\n')
    .map((b) => b.replace('*', '').trim())
    .filter(Boolean)
}
