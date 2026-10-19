#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { logInfo, logWarn } from './logger.js'

const PROJECT_ROOT = process.env.GITFLOW_ROOT || process.cwd()
export const README_FILE = `${PROJECT_ROOT}/README.md`

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
  if (!existsSync(README_FILE)) {
    logWarn(`README.md not found at ${README_FILE}`)
    return false
  }
  const existing = readFileSync(README_FILE, 'utf-8')
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
  writeFileSync(README_FILE, next, 'utf-8')
  return true
}
