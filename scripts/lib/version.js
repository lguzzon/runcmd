#!/usr/bin/env bun
import { existsSync, readFileSync } from 'node:fs'
import { GuardError } from './validators.js'
import { logError } from './logger.js'

const PROJECT_ROOT = process.env.GITFLOW_ROOT || process.cwd()
export const VERSION_FILE = `${PROJECT_ROOT}/version.txt`

/**
 * Check a string matches strict `X.Y.Z` semver (no leading zeros).
 * @param {string} version
 * @returns {boolean}
 */
export function validateVersion(version) {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)
}

/**
 * Split a version into its numeric components.
 * @param {string} version
 * @returns {{ major: number, minor: number, patch: number }}
 */
export function parseVersion(version) {
  const [major, minor, patch] = version.split('.').map(Number)
  return { major, minor, patch }
}

/**
 * Bump a version's major, minor, or patch component.
 * Unknown `bump` returns the version unchanged.
 * @param {string} version
 * @param {string} [bump] - `major`, `minor`, or `patch`
 * @returns {string} Bumped version
 */
export function incrementVersion(version, bump) {
  const { major, minor, patch } = parseVersion(version)
  switch ((bump || '').toLowerCase()) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
      return `${major}.${minor}.${patch + 1}`
    default:
      return version
  }
}

/**
 * Compare two versions.
 * @param {string} a
 * @param {string} b
 * @returns {1|0|-1} 1 when a > b, -1 when a < b, 0 when equal
 */
export function compareVersions(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1
    if (pa[i] < pb[i]) return -1
  }
  return 0
}

/**
 * Read the current version from version.txt (first line).
 * @returns {string} Version
 * @throws {GuardError} when the file is missing or malformed
 */
export function readVersion() {
  if (!existsSync(VERSION_FILE)) {
    logError(`version.txt not found at ${VERSION_FILE}`)
    throw new GuardError(`version.txt not found at ${VERSION_FILE}`)
  }
  const version = readFileSync(VERSION_FILE, 'utf-8')
    .trim()
    .split('\n')[0]
    .trim()
  if (!validateVersion(version)) {
    logError(`Invalid version format in version.txt: ${version}`)
    throw new GuardError(`Invalid version format in version.txt: ${version}`)
  }
  return version
}
