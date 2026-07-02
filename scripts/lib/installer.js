import { createHash } from 'node:crypto'
import { execSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { logError, logInfo, logSuccess, logWarn } from './logger.js'

const GITFLOW_INSTALLER_URL =
  'https://raw.githubusercontent.com/CJ-Systems/gitflow-cjs/v2.2.1/contrib/gitflow-installer.sh'
const GITFLOW_INSTALLER_SHA256 =
  '5bc020a856d79e4fb0961f48259614bb8abede22c9c815a9662e0fcd923d221c'
const GITFLOW_VERSION = 'v2.2.1'
const GITFLOW_PREFIX = `${homedir()}/.local`

/**
 * Check if git-flow is available; optionally install it.
 * @returns {boolean} true if available, false if not (with warning), exits on error
 */
export function ensureGitFlowAvailable({ autoInstall, offline, dryRun }) {
  const available = spawnSync('git', ['flow', 'version'], {
    encoding: 'utf-8',
    stdio: 'pipe'
  })
  if (available.status === 0) return true

  if (offline) {
    logError('git-flow not available (offline). Install it first.')
    process.exit(1)
  }
  if (!autoInstall) {
    logWarn('git-flow not found. Re-run with --auto-install to install it.')
    return false
  }
  if (dryRun) {
    logInfo('[dry-run] would install git-flow')
    return false
  }

  logInfo('Installing git-flow...')
  const tmpDir = execSync('mktemp -d 2>/dev/null || mktemp -d -t gitflow', {
    encoding: 'utf-8'
  }).trim()
  const tmpInstaller = `${tmpDir}/gitflow-installer.sh`
  try {
    execSync(`curl -fsSL '${GITFLOW_INSTALLER_URL}' -o '${tmpInstaller}'`, {
      stdio: ['pipe', 'inherit', 'inherit']
    })
    const actual = createHash('sha256')
      .update(readFileSync(tmpInstaller))
      .digest('hex')
    if (actual !== GITFLOW_INSTALLER_SHA256) {
      logError(
        `Installer checksum mismatch (expected ${GITFLOW_INSTALLER_SHA256}, got ${actual}). ` +
          'Download may be corrupted or tampered. Aborting.'
      )
      execSync(`rm -rf '${tmpDir}'`)
      process.exit(1)
    }
    execSync(
      `cd '${tmpDir}' && PREFIX='${GITFLOW_PREFIX}' bash '${tmpInstaller}' install version ${GITFLOW_VERSION}`,
      { stdio: 'inherit' }
    )
  } catch (error) {
    logError('git-flow installation failed')
    if (error.stderr) console.error(error.stderr.toString())
    process.exit(1)
  } finally {
    execSync(`rm -rf '${tmpDir}' 2>/dev/null || true`, { stdio: 'pipe' })
  }

  const installBin = `${GITFLOW_PREFIX}/bin`
  const pathDirs = (process.env.PATH || '').split(':')
  if (!pathDirs.includes(installBin)) {
    logWarn(
      `git-flow installed to ${installBin}, which is not in your PATH. ` +
        `Add it with: export PATH="${installBin}:$PATH"`
    )
  }
  logSuccess('git-flow installed')
  return true
}
