#!/usr/bin/env bun
import {existsSync, readFileSync} from "node:fs"
import {logError} from "../git-flow.js"

const PROJECT_ROOT = process.cwd()
const VERSION_FILE = `${PROJECT_ROOT}/version.txt`

export function validateVersion(version) {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)
}

export function parseVersion(version) {
  const [major, minor, patch] = version.split(".").map(Number)
  return {major, minor, patch}
}

export function incrementVersion(version, bump) {
  const {major, minor, patch} = parseVersion(version)
  switch ((bump || "").toLowerCase()) {
    case "major":
      return `${major + 1}.0.0`
    case "minor":
      return `${major}.${minor + 1}.0`
    case "patch":
      return `${major}.${minor}.${patch + 1}`
    default:
      return version
  }
}

export function compareVersions(a, b) {
  const pa = a.split(".").map(Number)
  const pb = b.split(".").map(Number)
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1
    if (pa[i] < pb[i]) return -1
  }
  return 0
}

export function readVersion() {
  if (!existsSync(VERSION_FILE)) {
    logError(`version.txt not found at ${VERSION_FILE}`)
    process.exit(1)
  }
  const version = readFileSync(VERSION_FILE, "utf-8")
    .trim()
    .split("\n")[0]
    .trim()
  if (!validateVersion(version)) {
    logError(`Invalid version format in version.txt: ${version}`)
    process.exit(1)
  }
  return version
}
