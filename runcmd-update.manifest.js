'use strict'

/**
 * Parse a sha256sum-style manifest line.
 * Accepts both `<hash>` and `<hash>  <filename>` (one or more spaces) forms.
 * Returns null for blank lines, comments, or malformed entries.
 * @param {string} line
 * @returns {{ hash: string, file: string } | null}
 */
function parseManifestLine(line) {
  if (typeof line !== 'string') return null
  const trimmed = line.trim()
  if (trimmed === '' || trimmed.startsWith('#')) return null
  // Match: 64-hex hash, optional spaces, then filename (no spaces, no '*' mode prefix).
  const match = trimmed.match(
    /^([0-9a-fA-F]{64})[ \t]+(?:\*?)([A-Za-z0-9_.\-/\\]+)$/
  )
  if (!match) return null
  return { hash: match[1].toLowerCase(), file: match[2] }
}

/**
 * Look up the expected hash for `fileName` in a manifest string.
 * Returns null when the file is not listed (caller must fail closed).
 * @param {string} manifest
 * @param {string} fileName
 * @returns {string | null} lowercase hex hash, or null if not present
 */
function expectedHashFor(manifest, fileName) {
  if (typeof manifest !== 'string' || typeof fileName !== 'string') return null
  const wanted = fileName.split(/[\\/]/).pop()
  for (const raw of manifest.split(/\r?\n/)) {
    const entry = parseManifestLine(raw)
    if (entry && entry.file === wanted) return entry.hash
  }
  return null
}

module.exports = { parseManifestLine, expectedHashFor }
