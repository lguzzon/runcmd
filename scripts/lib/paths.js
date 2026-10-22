import { runGit } from './git.js'

/**
 * Resolve the directory that owns the repository's version files.
 *
 * `GITFLOW_ROOT` wins so test fixtures keep their sandbox. Otherwise the
 * git toplevel wins over the cwd, so a CLI invoked from a subdirectory
 * still writes version.txt, CHANGELOG.md and README.md at the repository
 * root. Outside a repository the cwd is the fallback.
 *
 * Resolved on every call, never at module load, so the answer follows the
 * current working directory.
 * @returns {string} Absolute directory path
 */
export function repoRoot() {
  const override = process.env.GITFLOW_ROOT
  if (override) return override
  const toplevel = runGit('rev-parse --show-toplevel', { allowFail: true })
  return toplevel || process.cwd()
}
