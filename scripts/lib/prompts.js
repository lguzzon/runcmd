#!/usr/bin/env bun
import { readSync } from 'node:fs'

/**
 * Ask an open-ended question on stdin, resolving with the trimmed reply.
 * @param {string} question - Prompt text (no trailing space added)
 * @returns {Promise<string>}
 */
export async function promptText(question) {
  return new Promise((resolve) => {
    process.stdout.write(question)
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim())
    })
  })
}

/**
 * Synchronous, blocking variant of {@link promptText}. Reads a single 1024-byte
 * chunk from fd 0.
 * @param {string} question - Prompt text
 * @returns {string} Trimmed reply
 */
export function promptTextSync(question) {
  process.stdout.write(question)
  const buffer = Buffer.alloc(1024)
  const bytes = readSync(0, buffer, 0, buffer.length, null)
  return buffer.slice(0, bytes).toString().trim()
}

/**
 * Yes/no prompt. Resolves immediately with the default when `CI=true`.
 * @param {string} message - Question text
 * @param {boolean} [defaultYes] - Default when the user presses Enter
 * @returns {Promise<boolean>}
 */
export async function promptYesNo(message, defaultYes = false) {
  if (process.env.CI === 'true') return Promise.resolve(defaultYes)
  return promptText(`${message} ${defaultYes ? '[Y/n]' : '[y/N]'} `).then(
    (ans) => {
      if (!ans) return defaultYes
      return ans.toLowerCase().startsWith('y')
    }
  )
}
