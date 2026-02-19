#!/usr/bin/env bun
import {readSync} from "node:fs"

export async function promptText(question) {
  return new Promise(resolve => {
    process.stdout.write(question)
    process.stdin.once("data", data => {
      resolve(data.toString().trim())
    })
  })
}

export function promptTextSync(question) {
  process.stdout.write(question)
  const buffer = Buffer.alloc(1024)
  const bytes = readSync(0, buffer, 0, buffer.length, null)
  return buffer.slice(0, bytes).toString().trim()
}

export async function promptYesNo(message, defaultYes = false) {
  if (process.env.CI === "true") return Promise.resolve(defaultYes)
  return promptText(`${message} ${defaultYes ? "[Y/n]" : "[y/N]"} `).then(
    ans => {
      if (!ans) return defaultYes
      return ans.toLowerCase().startsWith("y")
    }
  )
}
