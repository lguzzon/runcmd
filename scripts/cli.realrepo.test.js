// ============================================================================
// Real-dispatch integration tests for cli.js — spawn the actual CLI
// (scripts/git-flow.js) against a throwaway git repository and assert the
// documented positional forms reach their handlers.
//
// Every command runs with --dry-run (and --offline where the handler pulls
// from a remote), so no branch, tag, or remote state is created. The
// repository is a temp dir removed after the suite.
//
// The CLI runs as a child process on purpose: a mock.module() in another
// test file of the same run would otherwise replace the real handlers this
// suite needs to exercise.
// ============================================================================

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CLI = join(import.meta.dir, 'git-flow.js')

let repoDir

/**
 * Run a git command inside the throwaway repository.
 * @param {string[]} args
 * @returns {string} stdout
 */
const git = (args) => {
  const res = spawnSync('git', args, {
    cwd: repoDir,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
  if (res.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${res.stderr}`)
  }
  return (res.stdout || '').trim()
}

/**
 * Invoke the CLI with argv and collect its output.
 * @param {string[]} args
 * @returns {{ code: number, out: string }}
 */
const runCli = (args) => {
  const res = spawnSync(process.execPath, [CLI, ...args], {
    cwd: repoDir,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
  return {
    code: res.status,
    out: `${res.stdout || ''}${res.stderr || ''}`
  }
}

// The handlers call `git flow version` before anything else; without
// git-flow on PATH every command exits 1 for the wrong reason.
const hasGitFlow =
  spawnSync('git', ['flow', 'version'], { encoding: 'utf-8' }).status === 0

beforeAll(() => {
  repoDir = mkdtempSync(join(tmpdir(), 'gitflow-cli-'))
  git(['init', '--initial-branch=main', '--quiet'])
  git(['config', 'user.email', 'test@example.com'])
  git(['config', 'user.name', 'Test'])
  git(['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(repoDir, 'init.txt'), 'init')
  // version.txt is what the release start path reads to bump the version.
  writeFileSync(join(repoDir, 'version.txt'), '1.0.0\n')
  git(['add', 'init.txt', 'version.txt'])
  git(['commit', '-m', 'initial commit', '--quiet'])
  git(['flow', 'init', '-d'])
  // The branch the publish/delete/finish/list cases operate on.
  git(['branch', 'feature/integration-x'])
})

afterAll(() => {
  if (repoDir) rmSync(repoDir, { recursive: true, force: true })
})

describe.skipIf(!hasGitFlow)('cli dispatch — positional <type> <name>', () => {
  test('start feature x → starts feature/x (not "Both <type> and <name>")', () => {
    // A name that has no branch yet — start refuses to overwrite one.
    const { code, out } = runCli(['start', 'feature', 'started-x', '--dry-run'])
    expect(out).not.toContain('Both <type> and <name> are required')
    expect(out).toContain('Starting feature branch: feature/started-x')
    expect(out).toContain('git flow feature start started-x')
    expect(code).toBe(0)
  })

  test('publish feature x → publishes feature/x', () => {
    const { code, out } = runCli([
      'publish',
      'feature',
      'integration-x',
      '--dry-run'
    ])
    expect(out).not.toContain('Both <type> and <name> are required')
    expect(out).toContain('Publishing feature branch: feature/integration-x')
    expect(out).toContain('git flow feature publish integration-x')
    expect(code).toBe(0)
  })

  test('delete feature x → deletes feature/x', () => {
    const { code, out } = runCli([
      'delete',
      'feature',
      'integration-x',
      '--dry-run'
    ])
    expect(out).not.toContain('Both <type> and <name> are required')
    expect(out).toContain('Deleting feature branch: feature/integration-x')
    expect(out).toContain('git flow feature delete integration-x')
    expect(code).toBe(0)
  })

  test('finish feature x → finishes feature/x', () => {
    const { code, out } = runCli([
      'finish',
      'feature',
      'integration-x',
      '--offline',
      '--dry-run'
    ])
    expect(out).not.toContain('Both <type> and <name> are required')
    expect(out).toContain('Finishing feature branch: feature/integration-x')
    expect(out).toContain('git flow feature finish integration-x')
    expect(code).toBe(0)
  })

  test('track feature x → tracks feature/x', () => {
    const { code, out } = runCli([
      'track',
      'feature',
      'integration-x',
      '--dry-run'
    ])
    expect(out).not.toContain('Both <type> and <name> are required')
    expect(out).toContain('Tracking feature branch: feature/integration-x')
    expect(out).toContain('git flow feature track integration-x')
    expect(code).toBe(0)
  })

  test('list feature → lists the feature branches', () => {
    const { code, out } = runCli(['list', 'feature'])
    expect(out).toContain('feature branches:')
    expect(out).toContain('feature/integration-x')
    expect(code).toBe(0)
  })
})

describe.skipIf(!hasGitFlow)('cli dispatch — unchanged forms', () => {
  test('clone <url> [dir] --dry-run → clones into the derived target', () => {
    const { code, out } = runCli([
      'clone',
      'https://example.com/repo.git',
      '--dry-run'
    ])
    expect(out).toContain('git clone https://example.com/repo.git repo')
    expect(code).toBe(0)
  })

  test('release start --bump minor --dry-run → release start path intact', () => {
    const { code, out } = runCli([
      'release',
      'start',
      '--bump',
      'minor',
      '--yes',
      '--dry-run'
    ])
    expect(out).toContain('Starting release branch: release/v1.1.0')
    expect(out).toContain('git flow release start v1.1.0')
    expect(code).toBe(0)
  })
})
