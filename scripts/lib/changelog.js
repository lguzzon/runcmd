#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { logInfo } from './logger.js'
import { runGit } from './git.js'

const PROJECT_ROOT = process.env.GITFLOW_ROOT || process.cwd()
export const CHANGELOG_FILE = `${PROJECT_ROOT}/CHANGELOG.md`

/**
 * Get the most recent reachable tag via `git describe`.
 * @returns {string|null} Tag name, or null when no tags exist
 */
export function getLastTag() {
  const tag = runGit('describe --tags --abbrev=0', { allowFail: true })
  return tag || null
}

/**
 * Collect commit subjects since a ref as `- <subject>` lines.
 * @param {string | null | undefined} [ref] - Starting ref; all history when omitted
 * @returns {string[]} Commit subjects, empty when no commits
 */
export function collectCommitsSince(ref) {
  const range = ref ? `${ref}..HEAD` : 'HEAD'
  const commits = runGit(`log ${range} --pretty=format:"- %s"`, {
    allowFail: true
  })
  if (!commits) return []
  return commits.split('\n').filter(Boolean)
}

/**
 * Prepend a `## v<version>` section to CHANGELOG.md with commits since the
 * last tag. Skips (returns false) when the version is already present or on
 * dry-run.
 * @param {string} version - Version without leading `v`
 * @param {{ dryRun?: boolean }} opts
 * @returns {boolean} true when the file was written
 */
export function appendChangelog(version, opts) {
  const existing = existsSync(CHANGELOG_FILE)
    ? readFileSync(CHANGELOG_FILE, 'utf-8')
    : ''
  if (existing.includes(`## v${version}`)) {
    logInfo('Changelog already contains this version. Skipping.')
    return false
  }
  const lastTag = getLastTag()
  const commits = collectCommitsSince(lastTag)
  const date = new Date().toISOString().slice(0, 10)
  const sectionLines = [
    `## v${version} - ${date}`,
    commits.length ? commits.join('\n') : '- Internal changes',
    ''
  ]
  const nextContent = `${sectionLines.join('\n')}${existing}`
  if (opts.dryRun) {
    logInfo(`[dry-run] would update CHANGELOG.md with v${version}`)
    return false
  }
  writeFileSync(CHANGELOG_FILE, nextContent, 'utf-8')
  return true
}

/**
 * Stage and commit the updated CHANGELOG.md.
 * @param {string} version - Version used in the commit message
 * @param {{ dryRun?: boolean }} opts - Honor `dryRun` to skip git calls
 */
export function commitChangelog(version, opts) {
  runGit(`add CHANGELOG.md`, { dryRun: opts.dryRun })
  runGit(`commit -m "docs: update changelog for v${version}"`, {
    dryRun: opts.dryRun
  })
}
