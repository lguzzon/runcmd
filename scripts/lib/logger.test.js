// Tests for lib/logger.js — colored console helpers. No dependencies, so the
// real module is imported directly and console output is captured.

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  COLOR_BOLD,
  COLOR_ERROR,
  COLOR_INFO,
  COLOR_RESET,
  COLOR_WARN,
  logError,
  logInfo,
  logSuccess,
  logWarn
} from './logger.js'

const realLog = console.log
const realErr = console.error

let logLines = []
let errLines = []

beforeEach(() => {
  logLines = []
  errLines = []
  console.log = (...a) => logLines.push(a.join(' '))
  console.error = (...a) => errLines.push(a.join(' '))
})

afterEach(() => {
  console.log = realLog
  console.error = realErr
})

describe('logInfo', () => {
  test('prefixes [INFO] in green with reset', () => {
    logInfo('hello')
    expect(logLines[0]).toBe(`${COLOR_INFO}[INFO]${COLOR_RESET} hello`)
  })
})

describe('logWarn', () => {
  test('prefixes [WARN] in yellow', () => {
    logWarn('careful')
    expect(logLines[0]).toBe(`${COLOR_WARN}[WARN]${COLOR_RESET} careful`)
  })
})

describe('logError', () => {
  test('writes [ERROR] in red to stderr', () => {
    logError('boom')
    expect(errLines[0]).toBe(`${COLOR_ERROR}[ERROR]${COLOR_RESET} boom`)
  })
})

describe('logSuccess', () => {
  test('prefixes [OK] in green', () => {
    logSuccess('done')
    expect(logLines[0]).toBe(`${COLOR_INFO}[OK]${COLOR_RESET} done`)
  })
})

describe('color constants', () => {
  test('are ANSI escape codes', () => {
    expect(COLOR_INFO).toBe('\x1b[32m')
    expect(COLOR_WARN).toBe('\x1b[33m')
    expect(COLOR_ERROR).toBe('\x1b[31m')
    expect(COLOR_BOLD).toBe('\x1b[1m')
    expect(COLOR_RESET).toBe('\x1b[0m')
  })
})
