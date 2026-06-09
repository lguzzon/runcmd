export const releaseInitDefaults = {
  type: "release",
  bump: undefined,
  version: undefined,
  push: false,
  dryRun: false,
  yes: false,
  noChangelog: false,
  offline: false,
  help: false
}

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
