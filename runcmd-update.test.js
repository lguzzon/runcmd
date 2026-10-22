const { describe, expect, test } = require('bun:test')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { createHash } = require('crypto')
const { runUpdateCheck } = require('./runcmd-update.js')

const REMOTE_VERSION = '2.0.0'

function makeEnv({
  remoteVersion = REMOTE_VERSION,
  target = 'runcmd.bat'
} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runcmd-update-'))
  const runnerDir = path.join(root, 'runner')
  fs.mkdirSync(runnerDir)
  const scriptPath = path.join(runnerDir, target)
  fs.writeFileSync(scriptPath, ':: old ' + target + '\r\n')
  fs.writeFileSync(path.join(runnerDir, 'version.txt'), '1.0.0\n')
  const stateFile = path.join(root, 'state', 'state.json')
  const lines = []
  const newScript = ':: fake new ' + target + '\r\n@ECHO OFF\r\n'
  const newHash = createHash('sha256').update(newScript).digest('hex')
  const responses = {
    'https://lguzzon.github.io/runcmd/version.txt': remoteVersion,
    ['https://lguzzon.github.io/runcmd/' + target]: newScript,
    'https://lguzzon.github.io/runcmd/update.sha256': `# manifest\n${newHash}  ${target}\n`
  }
  const fetchImpl = async (url) => {
    if (!(url in responses)) throw new Error('unexpected fetch: ' + url)
    return { ok: true, text: async () => responses[url] }
  }
  return {
    root,
    scriptPath,
    stateFile,
    fetchImpl,
    newScript,
    log: (line) => lines.push(line),
    lines
  }
}

describe('runUpdateCheck', () => {
  test('UPDATE_READY handshake records the applied version beside the runner', async () => {
    const env = makeEnv()
    const result = await runUpdateCheck({
      fetchImpl: env.fetchImpl,
      log: env.log,
      scriptPath: env.scriptPath,
      currentVersion: '1.0.0',
      stateFile: env.stateFile
    })

    const tempFile = env.scriptPath + '.new'
    expect(result).toEqual({
      status: 'update-ready',
      version: REMOTE_VERSION,
      tempFile
    })
    expect(env.lines).toEqual([`UPDATE_READY|${tempFile}|${REMOTE_VERSION}`])
    expect(fs.readFileSync(tempFile, 'utf8')).toBe(env.newScript)
    expect(
      fs.readFileSync(path.join(env.root, 'runner', 'version.txt'), 'utf8')
    ).toBe(REMOTE_VERSION + '\n')
    const state = JSON.parse(fs.readFileSync(env.stateFile, 'utf8'))
    expect(state.last_check).toBeGreaterThan(0)
  })

  test('up-to-date writes state only, no temp file and no version.txt change', async () => {
    const env = makeEnv()
    const result = await runUpdateCheck({
      fetchImpl: env.fetchImpl,
      log: env.log,
      scriptPath: env.scriptPath,
      currentVersion: REMOTE_VERSION,
      stateFile: env.stateFile
    })

    expect(result).toEqual({
      status: 'up-to-date',
      version: REMOTE_VERSION
    })
    expect(env.lines).toEqual([])
    expect(fs.existsSync(env.scriptPath + '.new')).toBe(false)
    expect(
      fs.readFileSync(path.join(env.root, 'runner', 'version.txt'), 'utf8')
    ).toBe('1.0.0\n')
    expect(fs.existsSync(env.stateFile)).toBe(true)
  })

  test('skips the fetch entirely inside the check interval', async () => {
    const env = makeEnv()
    fs.mkdirSync(path.dirname(env.stateFile), { recursive: true })
    fs.writeFileSync(env.stateFile, JSON.stringify({ last_check: Date.now() }))

    const result = await runUpdateCheck({
      fetchImpl: async () => {
        throw new Error('fetch must not run inside the check interval')
      },
      log: env.log,
      scriptPath: env.scriptPath,
      currentVersion: '1.0.0',
      stateFile: env.stateFile
    })

    expect(result).toEqual({ status: 'skipped' })
  })

  test('checksum mismatch aborts fail-closed: nothing written, nothing logged', async () => {
    const env = makeEnv()
    const responses = {
      'https://lguzzon.github.io/runcmd/version.txt': REMOTE_VERSION,
      'https://lguzzon.github.io/runcmd/runcmd.bat': env.newScript,
      'https://lguzzon.github.io/runcmd/update.sha256': `# manifest\n${'0'.repeat(64)}  runcmd.bat\n`
    }
    const fetchImpl = async (url) => ({
      ok: true,
      text: async () => responses[url]
    })

    await expect(
      runUpdateCheck({
        fetchImpl,
        log: env.log,
        scriptPath: env.scriptPath,
        currentVersion: '1.0.0',
        stateFile: env.stateFile
      })
    ).rejects.toThrow('Update checksum mismatch')

    expect(env.lines).toEqual([])
    expect(fs.existsSync(env.scriptPath + '.new')).toBe(false)
    expect(
      fs.readFileSync(path.join(env.root, 'runner', 'version.txt'), 'utf8')
    ).toBe('1.0.0\n')
    expect(fs.existsSync(env.stateFile)).toBe(false)
  })

  test('derives the update target from the runner basename (runcmd.sh)', async () => {
    const env = makeEnv({ target: 'runcmd.sh' })
    const result = await runUpdateCheck({
      fetchImpl: env.fetchImpl,
      log: env.log,
      scriptPath: env.scriptPath,
      currentVersion: '1.0.0',
      stateFile: env.stateFile
    })

    const tempFile = env.scriptPath + '.new'
    expect(result).toEqual({
      status: 'update-ready',
      version: REMOTE_VERSION,
      tempFile
    })
    expect(env.lines).toEqual([`UPDATE_READY|${tempFile}|${REMOTE_VERSION}`])
    expect(fs.readFileSync(tempFile, 'utf8')).toBe(env.newScript)
  })

  test('a renamed runner copy fails closed instead of fetching runcmd.*', async () => {
    const env = makeEnv()
    const renamedPath = path.join(env.root, 'runner', 'renamed.sh')

    await expect(
      runUpdateCheck({
        fetchImpl: env.fetchImpl,
        log: env.log,
        scriptPath: renamedPath,
        currentVersion: '1.0.0',
        stateFile: env.stateFile
      })
    ).rejects.toThrow('unexpected fetch')

    expect(fs.existsSync(env.scriptPath + '.new')).toBe(false)
  })
})

// runcmd.bat cannot execute on this platform; these are the only Windows-side
// behaviors the restart handshake depends on, checked as source contract and
// exercised for real by the windows-latest CI job.
describe('runcmd.bat restart contract (source check)', () => {
  const bat = fs.readFileSync(path.join(__dirname, 'runcmd.bat'), 'utf8')

  test('captures %* before the first CALL and replays it on the restart', () => {
    const capture = bat.indexOf('SET "INVOCATION_ARGS=%*"')
    expect(capture).toBeGreaterThan(-1)
    const firstCall = bat.indexOf('CALL :')
    expect(capture).toBeLessThan(firstCall)
    expect(bat).toContain('"%~f0" !INVOCATION_ARGS!')
  })

  test('treats RUNCMD_DEBUG=1 as DEBUG=1', () => {
    expect(bat).toContain('IF "%RUNCMD_DEBUG%"=="1" SET "DEBUG=1"')
  })

  test('records the applied version after a successful move', () => {
    expect(bat).toContain('ECHO !NEW_VER!>"%~dp0version.txt"')
  })
  test('restores the previous version when the update aborts', () => {
    expect(bat).toContain(':update_abort')
    expect(bat).toContain(':restore_version')
  })
})
