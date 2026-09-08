const { describe, expect, test } = require('bun:test')
const {
  expectedHashFor,
  parseManifestLine
} = require('./runcmd-update.manifest.js')

const HASH = '5bc020a856d79e4fb0961f48259614bb8abede22c9c815a9662e0fcd923d221c'
const OTHER = '0000000000000000000000000000000000000000000000000000000000000000'

describe('parseManifestLine', () => {
  test('parses <hash>  <file> with two spaces', () => {
    expect(parseManifestLine(`${HASH}  runcmd.sh`)).toEqual({
      hash: HASH,
      file: 'runcmd.sh'
    })
  })

  test('parses <hash> <file> with single space', () => {
    expect(parseManifestLine(`${HASH} runcmd.sh`)).toEqual({
      hash: HASH,
      file: 'runcmd.sh'
    })
  })

  test('parses <hash> *<file> binary mode marker', () => {
    expect(parseManifestLine(`${HASH} *runcmd.bat`)).toEqual({
      hash: HASH,
      file: 'runcmd.bat'
    })
  })

  test('normalizes uppercase hash', () => {
    const upper = HASH.toUpperCase()
    const result = parseManifestLine(`${upper}  runcmd.sh`)
    expect(result?.hash).toBe(HASH)
  })

  test('returns null for blank and comment lines', () => {
    expect(parseManifestLine('')).toBeNull()
    expect(parseManifestLine('   ')).toBeNull()
    expect(parseManifestLine('# sha256sum manifest')).toBeNull()
  })

  test('rejects malformed entries', () => {
    expect(parseManifestLine('not-a-hash  runcmd.sh')).toBeNull()
    expect(parseManifestLine(`${HASH.slice(0, 63)}  runcmd.sh`)).toBeNull()
    expect(parseManifestLine(`${HASH}  bad name with spaces.sh`)).toBeNull()
    expect(parseManifestLine(`${HASH}`)).toBeNull()
  })

  test('returns null for non-string input', () => {
    expect(parseManifestLine(null)).toBeNull()
    expect(parseManifestLine(undefined)).toBeNull()
    expect(parseManifestLine(42)).toBeNull()
  })
})

describe('expectedHashFor', () => {
  test('returns hash when file is listed', () => {
    const manifest = `# runcmd update manifest\n${HASH}  runcmd.sh\n${OTHER}  other.bin\n`
    expect(expectedHashFor(manifest, 'runcmd.sh')).toBe(HASH)
    expect(expectedHashFor(manifest, 'other.bin')).toBe(OTHER)
  })

  test('returns null when file is not listed (fail-closed)', () => {
    const manifest = `${HASH}  runcmd.sh\n`
    expect(expectedHashFor(manifest, 'runcmd.bat')).toBeNull()
    expect(expectedHashFor(manifest, 'nonexistent')).toBeNull()
  })

  test('returns null for empty manifest', () => {
    expect(expectedHashFor('', 'runcmd.sh')).toBeNull()
  })

  test('returns null when manifest is malformed', () => {
    expect(expectedHashFor('not a manifest', 'runcmd.sh')).toBeNull()
    expect(expectedHashFor(`garbage line\n${HASH}\n`, 'runcmd.sh')).toBeNull()
  })

  test('returns null for non-string inputs', () => {
    expect(expectedHashFor(null, 'runcmd.sh')).toBeNull()
    expect(expectedHashFor('manifest', null)).toBeNull()
  })

  test('returns first matching entry for duplicated file', () => {
    const manifest = `${OTHER}  runcmd.sh\n${HASH}  runcmd.sh\n`
    expect(expectedHashFor(manifest, 'runcmd.sh')).toBe(OTHER)
  })
})
