export const COLOR_INFO = '\x1b[32m'
export const COLOR_WARN = '\x1b[33m'
export const COLOR_ERROR = '\x1b[31m'
export const COLOR_RESET = '\x1b[0m'
export const COLOR_BOLD = '\x1b[1m'

export function logInfo(message) {
  console.log(`${COLOR_INFO}[INFO]${COLOR_RESET} ${message}`)
}

export function logWarn(message) {
  console.log(`${COLOR_WARN}[WARN]${COLOR_RESET} ${message}`)
}

export function logError(message) {
  console.error(`${COLOR_ERROR}[ERROR]${COLOR_RESET} ${message}`)
}

export function logSuccess(message) {
  console.log(`${COLOR_INFO}[OK]${COLOR_RESET} ${message}`)
}
