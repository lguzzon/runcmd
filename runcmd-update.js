const fs = require('fs')
const path = require('path')
const os = require('os')
const { createHash } = require('crypto')
const {
  expectedHashFor,
  parseManifestLine
} = require('./runcmd-update.manifest.js')

const UPDATE_URL_BASE = 'https://lguzzon.github.io/runcmd'
const CHECK_INTERVAL = 7 * 24 * 3600 * 1000 // 7 days in ms

/**
 * Run one update check cycle.
 * Side effects: state file writes, the `.new` temp script, and the
 * runner-adjacent version.txt are all on the real (or injected) fs.
 * The update target is derived from the runner's basename, so this one
 * path serves runcmd.sh and runcmd.bat; a renamed copy fetches its own
 * name, misses, and fails closed instead of clobbering the original.
 * @param {object} [opts] injection points for tests
 * @param {typeof fetch} [opts.fetchImpl] fetch replacement
 * @param {(line: string) => void} [opts.log] UPDATE_READY sink
 * @param {string} [opts.scriptPath] path of the running runner script
 * @param {string} [opts.currentVersion] version of the running runner script
 * @param {string} [opts.stateFile] path to state.json
 * @returns {Promise<{status: 'skipped'|'up-to-date'|'update-ready', version?: string, tempFile?: string}>}
 */
async function runUpdateCheck(opts = {}) {
  const {
    fetchImpl = fetch,
    log = console.log,
    scriptPath = process.argv[2],
    currentVersion = process.argv[3],
    stateFile = path.join(os.homedir(), '.runcmd', 'state.json')
  } = opts

  if (process.env.RUNCMD_NO_UPDATE === '1') return { status: 'skipped' }

  const target = path.basename(scriptPath)

  const home = path.dirname(stateFile)
  if (!fs.existsSync(home)) fs.mkdirSync(home, { recursive: true })

  let state = { last_check: 0 }
  try {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'))
  } catch (e) {
    console.error('[WARN] Could not read update state:', e.message)
  }

  const now = Date.now()
  if (now - state.last_check < CHECK_INTERVAL) return { status: 'skipped' }

  console.error('[INFO] Checking for updates...')
  const res = await fetchImpl(UPDATE_URL_BASE + '/version.txt', {
    signal: AbortSignal.timeout(5000)
  })
  if (!res.ok) throw new Error('Failed to fetch version')
  const remoteVersion = (await res.text()).trim()

  if (compareVersions(currentVersion, remoteVersion) >= 0) {
    console.error('[INFO] Runcmd is up to date ' + currentVersion)
    state.last_check = now
    fs.writeFileSync(stateFile, JSON.stringify(state))
    return { status: 'up-to-date', version: currentVersion }
  }

  console.error(
    '[INFO] New version available: ' + remoteVersion + '. Updating...'
  )
  const scriptRes = await fetchImpl(UPDATE_URL_BASE + '/' + target, {
    signal: AbortSignal.timeout(10000)
  })
  if (!scriptRes.ok) throw new Error('Failed to fetch update')
  const newContent = await scriptRes.text()

  if (!newContent.includes(target)) throw new Error('Invalid update content')

  // Fail-closed: verify SHA256 from update.sha256 manifest before overwriting
  // the running runner script. Manifest travels over the same TLS channel as
  // the payload — same posture as installer.js until a signed manifest ships.
  const manifestRes = await fetchImpl(UPDATE_URL_BASE + '/update.sha256', {
    signal: AbortSignal.timeout(5000)
  })
  if (!manifestRes.ok) throw new Error('Failed to fetch update manifest')
  const manifest = await manifestRes.text()
  const expected = expectedHashFor(manifest, target)
  if (!expected) throw new Error(target + ' missing from update manifest')
  const actual = createHash('sha256').update(newContent).digest('hex')
  if (actual !== expected) {
    throw new Error(
      'Update checksum mismatch (expected ' +
        expected +
        ', got ' +
        actual +
        '). Aborting.'
    )
  }

  // Write new content to a temporary file
  const tempFile = scriptPath + '.new'
  fs.writeFileSync(tempFile, newContent)

  // Record the target version beside the runner as part of the UPDATE_READY
  // handshake: both runners read the installed version from version.txt, so
  // without this the same update is re-downloaded on every check interval.
  // The runner restores the previous version if the swap fails.
  fs.writeFileSync(
    path.join(path.dirname(scriptPath), 'version.txt'),
    remoteVersion + '\n'
  )

  // Signal the runner script to swap itself
  log('UPDATE_READY|' + tempFile + '|' + remoteVersion)

  state.last_check = now
  fs.writeFileSync(stateFile, JSON.stringify(state))
  return { status: 'update-ready', version: remoteVersion, tempFile }
}

async function main() {
  try {
    await runUpdateCheck()
  } catch (e) {
    console.error('[WARN] Update check failed:', e.message)
  }
}

function compareVersions(a, b) {
  if (a === b) return 0
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na > nb) return 1
    if (nb > na) return -1
  }
  return 0
}

if (require.main === module) {
  main()
}

module.exports = {
  main,
  runUpdateCheck,
  compareVersions,
  parseManifestLine,
  expectedHashFor
}
