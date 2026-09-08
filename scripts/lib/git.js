import { spawnSync } from 'node:child_process'
import { logError, logInfo } from './logger.js'

/** Split a command string into an array of arguments, handling quoted tokens. */
export function splitArgs(str) {
  const args = []
  let current = ''
  let inQuote = false
  let escapeNext = false
  for (const char of str) {
    if (escapeNext) {
      current += char
      escapeNext = false
      continue
    }
    if (char === '\\') {
      escapeNext = true
      continue
    }
    if (char === '"') {
      inQuote = !inQuote
      continue
    }
    if (char === ' ' && !inQuote) {
      if (current) {
        args.push(current)
        current = ''
      }
      continue
    }
    current += char
  }
  if (current) args.push(current)
  return args
}

/**
 * Execute a git command.
 * @param {string|string[]} args - Argument string or array
 * @param {{ allowFail?: boolean, dryRun?: boolean, pipeStdout?: boolean }} [opts]
 * @returns {string|null} stdout trimmed, or null on failure (allowFail), or exits
 */
export function runGit(
  args,
  { allowFail = false, dryRun = false, pipeStdout = false } = {}
) {
  const argArray = typeof args === 'string' ? splitArgs(args) : args
  const cmd = `git ${argArray.join(' ')}`
  if (dryRun) {
    logInfo(`[dry-run] ${cmd}`)
    return ''
  }
  const result = spawnSync('git', argArray, {
    encoding: 'utf-8',
    stdio: ['pipe', pipeStdout ? 'inherit' : 'pipe', 'pipe']
  })
  if (result.error || result.status !== 0) {
    if (allowFail) return null
    logError(`${cmd} failed`)
    if (result.stderr) console.error(result.stderr)
    process.exit(1)
  }
  return (result.stdout || '').trim()
}

/**
 * Execute a git-flow command.
 * @param {string|string[]} args - Argument string or array
 * @param {{ allowFail?: boolean, dryRun?: boolean, pipeStdout?: boolean }} [opts]
 * @returns {string|null} stdout trimmed, or null on failure (allowFail), or exits
 */
export function runGitFlow(
  args,
  { allowFail = false, dryRun = false, pipeStdout = false } = {}
) {
  const argArray = typeof args === 'string' ? splitArgs(args) : args
  const cmd = `git flow ${argArray.join(' ')}`
  if (dryRun) {
    logInfo(`[dry-run] ${cmd}`)
    return ''
  }
  const result = spawnSync('git', ['flow', ...argArray], {
    encoding: 'utf-8',
    stdio: ['pipe', pipeStdout ? 'inherit' : 'pipe', 'pipe']
  })
  if (result.error || result.status !== 0) {
    if (allowFail) return null
    logError(`${cmd} failed`)
    if (result.stderr) console.error(result.stderr)
    process.exit(1)
  }
  return (result.stdout || '').trim()
}
