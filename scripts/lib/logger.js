/** Green ANSI escape sequence. */
export const COLOR_INFO = '\x1b[32m'
/** Yellow ANSI escape sequence. */
export const COLOR_WARN = '\x1b[33m'
/** Red ANSI escape sequence. */
export const COLOR_ERROR = '\x1b[31m'
/** Reset ANSI escape sequence. */
export const COLOR_RESET = '\x1b[0m'
/** Bold ANSI escape sequence. */
export const COLOR_BOLD = '\x1b[1m'

/**
 * Print an informational line to stdout.
 * @param {string} message
 */
export function logInfo(message) {
  console.log(`${COLOR_INFO}[INFO]${COLOR_RESET} ${message}`)
}

/**
 * Print a warning line to stdout.
 * @param {string} message
 */
export function logWarn(message) {
  console.log(`${COLOR_WARN}[WARN]${COLOR_RESET} ${message}`)
}

/**
 * Print an error line to stderr.
 * @param {string} message
 */
export function logError(message) {
  console.error(`${COLOR_ERROR}[ERROR]${COLOR_RESET} ${message}`)
}

/**
 * Print a success line to stdout.
 * @param {string} message
 */
export function logSuccess(message) {
  console.log(`${COLOR_INFO}[OK]${COLOR_RESET} ${message}`)
}
