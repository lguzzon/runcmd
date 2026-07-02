import { logError } from './logger.js'
import { runGit } from './git.js'

export function ensureCleanTree() {
  const status = runGit('status --porcelain', { allowFail: true })
  if (status && status.length > 0) {
    logError('Uncommitted changes detected. Please commit or stash them first.')
    process.exit(1)
  }
}

export function ensureBranchExists(name) {
  const res = runGit(`show-ref --verify --quiet refs/heads/${name}`, {
    allowFail: true
  })
  if (res === null) {
    logError(`Required branch '${name}' not found.`)
    process.exit(1)
  }
}

export function ensureBranchMissing(name) {
  const exists = runGit(`show-ref --verify --quiet refs/heads/${name}`, {
    allowFail: true
  })
  if (exists !== null) {
    logError(`Branch '${name}' already exists.`)
    process.exit(1)
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
    process.exit(1)
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
    process.exit(1)
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
    process.exit(1)
  }
}

export function getGitFlowConfig() {
  const master = runGit('config --get gitflow.branch.master', {
    allowFail: true
  })
  const develop = runGit('config --get gitflow.branch.develop', {
    allowFail: true
  })
  const featurePrefix = runGit('config --get gitflow.prefix.feature', {
    allowFail: true
  })
  const releasePrefix = runGit('config --get gitflow.prefix.release', {
    allowFail: true
  })
  const hotfixPrefix = runGit('config --get gitflow.prefix.hotfix', {
    allowFail: true
  })
  const supportPrefix = runGit('config --get gitflow.prefix.support', {
    allowFail: true
  })

  return {
    master: master || 'master',
    develop: develop || 'develop',
    featurePrefix: featurePrefix || 'feature/',
    releasePrefix: releasePrefix || 'release/',
    hotfixPrefix: hotfixPrefix || 'hotfix/',
    supportPrefix: supportPrefix || 'support/'
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
