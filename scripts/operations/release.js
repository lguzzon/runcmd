#!/usr/bin/env bun
import {
  COLOR_BOLD,
  COLOR_RESET,
  ensureGitFlowAvailable,
  ensureGitFlowInitialized,
  logError,
} from "../git-flow.js";
import { handleFinish, handleStart } from "../lib/release-utils.js";

export function printHelp() {
  console.log(`
${COLOR_BOLD}Git Flow Release${COLOR_RESET}

Usage: bun scripts/git-flow.js release <action> [options]

Manage release branches with automatic version bumping.

Actions:
  start                     Start a new release branch
  finish                    Finish and merge a release branch

Start Options:
  --name <name>             Release name (default: nextRelease)
  --bump <patch|minor|major> Auto bump from current version
  --version <x.y.z>         Explicit version
  --base <branch>           Base branch (default: develop)
  --push                    Push new branch and commit
  --no-changelog            Skip changelog update

Finish Options:
  --name <name>             Release name (default: nextRelease)
  --tag <tag>               Tag name (required)
  --message <msg>           Tag message (required)
  --push                    Push branches and tags
  --keep-branch             Keep the release branch

Common Options:
  -h, --help                Show this help message
  --dry-run                 Print actions without executing
  --offline                 Skip remote operations
  --yes                     Non-interactive mode

Examples:
  bun scripts/git-flow.js release start --bump minor
  bun scripts/git-flow.js release start --version 1.2.0
  bun scripts/git-flow.js release finish --tag v1.2.0 --message "Release 1.2.0" --push
`);
}

export async function handleRelease(action, opts) {
  const available = ensureGitFlowAvailable({ ...opts, autoInstall: false });
  if (!available) {
    logError("git-flow is required for release operations");
    process.exit(1);
  }

  ensureGitFlowInitialized();

  // Check for help flag before processing
  if (opts.help) {
    printHelp();
    return;
  }

  if (action === "start") {
    await handleStart(
      {
        defaultBump: "minor",
        defaultBase: "develop",
        prefix: "release/",
        typeLabel: "release",
      },
      opts,
    );
  } else if (action === "finish") {
    await handleFinish({ prefix: "release/", typeLabel: "release" }, opts);
  } else {
    logError(`Unknown release action: ${action}`);
    printHelp();
    process.exit(1);
  }
}
