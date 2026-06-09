const fs = require('fs')
const path = require('path')
const os = require('os')

const UPDATE_URL_BASE = 'https://lguzzon.github.io/runcmd'
const RUNCMD_HOME = path.join(os.homedir(), '.runcmd')
const STATE_FILE = path.join(RUNCMD_HOME, 'state.json')
const CHECK_INTERVAL = 7 * 24 * 3600 * 1000 // 7 days in ms
const CURRENT_SCRIPT = process.argv[2]
const CURRENT_VERSION = process.argv[3]

async function main() {
  try {
    if (!fs.existsSync(RUNCMD_HOME))
      fs.mkdirSync(RUNCMD_HOME, { recursive: true })

    let state = { last_check: 0 }
    try {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    } catch {}

    const now = Date.now()
    if (now - state.last_check < CHECK_INTERVAL) return

    console.error('[INFO] Checking for updates...')
    const res = await fetch(UPDATE_URL_BASE + '/version.txt', {
      signal: AbortSignal.timeout(5000)
    })
    if (!res.ok) throw new Error('Failed to fetch version')
    const remoteVersion = (await res.text()).trim()

    if (compareVersions(CURRENT_VERSION, remoteVersion) >= 0) {
      console.error('[INFO] Runcmd is up to date ' + CURRENT_VERSION)
      state.last_check = now
      fs.writeFileSync(STATE_FILE, JSON.stringify(state))
      return
    }

    console.error(
      '[INFO] New version available: ' + remoteVersion + '. Updating...'
    )
    const scriptRes = await fetch(UPDATE_URL_BASE + '/runcmd.bat', {
      signal: AbortSignal.timeout(10000)
    })
    if (!scriptRes.ok) throw new Error('Failed to fetch update')
    const newContent = await scriptRes.text()

    if (!newContent.includes('runcmd.bat'))
      throw new Error('Invalid update content')

    // Write new content to a temporary file
    const tempFile = CURRENT_SCRIPT + '.new'
    fs.writeFileSync(tempFile, newContent)

    // Signal the batch script to update
    console.log('UPDATE_READY|' + tempFile + '|' + remoteVersion)

    // Update state (assuming success)
    state.current_version = remoteVersion
    state.last_check = now
    fs.writeFileSync(STATE_FILE, JSON.stringify(state))
  } catch {
    // console.error('Update check failed:', e.message);
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

main()
