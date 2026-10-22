#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { logInfo, logWarn } from './logger.js'
import { repoRoot } from './paths.js'

/**
 * Absolute path of README.md, resolved at call time against the repository
 * root.
 * @returns {string} Path to README.md
 */
export function readmeFile() {
  return `${repoRoot()}/README.md`
}

const BADGE_RE = /(badge\/version-)\d+\.\d+\.\d+(-)/
const FOOTER_RE = /^(\*Version )\d+\.\d+\.\d+(\*)$/m

/**
 * Rewrite README.md's version references to `version`: the shields.io
 * `version-X.Y.Z-blue` badge and the `*Version X.Y.Z*` footer. README is
 * hand-maintained, so the release flow has to carry it or it drifts.
 * Returns false without writing when README.md is missing, already current,
 * or on dry-run.
 * @param {string} version - Version without leading `v`
 * @param {{ dryRun?: boolean }} opts
 * @returns {boolean} true when the file was written
 */
export function updateReadmeVersion(version, opts) {
  const file = readmeFile()
  if (!existsSync(file)) {
    logWarn(`README.md not found at ${file}`)
    return false
  }
  const existing = readFileSync(file, 'utf-8')
  const next = existing
    .replace(BADGE_RE, `$1${version}$2`)
    .replace(FOOTER_RE, `$1${version}$2`)
  if (next === existing) {
    logInfo('README already lists this version. Skipping.')
    return false
  }
  if (opts.dryRun) {
    logInfo(`[dry-run] would update README.md with v${version}`)
    return false
  }
  writeFileSync(file, next, 'utf-8')
  return true
}
