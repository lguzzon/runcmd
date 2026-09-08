// Tests for lib/prompts.js. promptYesNo's CI bypass is pure and tested.
// promptText is exercised against a fake stdin that records the data handler.
// promptTextSync reads fd 0 via readSync(0, ...) and is not portable to a
// unit harness — covered manually.

import { afterEach, describe, expect, test } from 'bun:test'
import { promptText, promptYesNo } from './prompts.js'

const realStdin = process.stdin
const realStdout = process.stdout
const realCi = process.env.CI

afterEach(() => {
  process.stdin = realStdin
  process.stdout = realStdout
  if (realCi === undefined) delete process.env.CI
  else process.env.CI = realCi
})

describe('promptYesNo — CI bypass', () => {
  test('CI=true returns defaultYes=true without reading stdin', async () => {
    process.env.CI = 'true'
    await expect(promptYesNo('continue?', true)).resolves.toBe(true)
  })

  test('CI=true returns defaultYes=false without reading stdin', async () => {
    process.env.CI = 'true'
    await expect(promptYesNo('continue?', false)).resolves.toBe(false)
  })

  test('defaultYes defaults to false', async () => {
    process.env.CI = 'true'
    await expect(promptYesNo('continue?')).resolves.toBe(false)
  })
})

describe('promptText', () => {
  test('writes the question and resolves with trimmed stdin data', async () => {
    const writes = []
    let dataHandler = null
    process.stdout = { write: (s) => writes.push(s) }
    process.stdin = {
      once: (ev, cb) => {
        if (ev === 'data') dataHandler = cb
      }
    }

    const promise = promptText('Repo name: ')
    expect(writes.join('')).toBe('Repo name: ')
    // Simulate a line of input arriving.
    dataHandler(Buffer.from('  my-repo  \n'))
    await expect(promise).resolves.toBe('my-repo')
  })
})
