// Test doubles for mock.module. The factories return the full public
// surface of ../git-flow.js and ../lib/core.js so any handler links
// against the mock regardless of which test file registered it; a new
// export in the real module needs one update here instead of one per
// test file. Override the members a suite records or asserts on.

function inert() {}

export function gitFlowDouble(overrides = {}) {
  return {
    COLOR_BOLD: '',
    COLOR_ERROR: '',
    COLOR_INFO: '',
    COLOR_RESET: '',
    COLOR_WARN: '',
    appendChangelog: inert,
    changelogFile: () => '',
    checkout: inert,
    collectCommitsSince: () => [],
    commitChangelog: inert,
    compareVersions: () => 0,
    currentBranch: () => 'develop',
    detectMainBranch: () => 'main',
    ensureBranchExists: inert,
    ensureBranchMissing: inert,
    ensureCleanTree: inert,
    ensureGitFlowAvailable: () => true,
    ensureGitFlowInitialized: inert,
    ensureTagMissing: inert,
    getLastTag: () => '',
    getBranchType: () => '',
    getGitFlowConfig: () => ({}),
    incrementVersion: (v) => v,
    listBranchesByType: () => [],
    logError: inert,
    logInfo: inert,
    logSuccess: inert,
    logWarn: inert,
    mergeBranch: inert,
    parseArgs: inert,
    parseFlags: () => ({}),
    parseVersion: (v) => v,
    promptText: inert,
    promptTextSync: () => '',
    promptYesNo: () => false,
    pullBranch: inert,
    pushBranch: inert,
    readVersion: () => '0.0.0',
    readmeFile: () => '',
    releaseFinalizeDefaults: {},
    releaseInitDefaults: {},
    runGit: () => '',
    runGitFlow: () => '',
    stashPop: inert,
    stashPush: inert,
    updateReadmeVersion: inert,
    validateBranchName: () => true,
    validateVersion: () => true,
    versionFile: () => '',
    ...overrides
  }
}

export function coreDouble(overrides = {}) {
  return {
    requireTypeAndName(opts) {
      if (!opts.type || !opts.name) process.exit(1)
      return { type: opts.type, name: opts.name }
    },
    requireValidCommand: () => true,
    ...overrides
  }
}
