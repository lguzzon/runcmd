#!/usr/bin/env bun
import {
	COLOR_BOLD,
	COLOR_RESET,
	ensureBranchExists,
	ensureGitFlowAvailable,
	ensureGitFlowInitialized,
	checkout,
	currentBranch,
	detectMainBranch,
	logError,
	logInfo,
	logSuccess,
	mergeBranch,
	pullBranch,
	pushBranch,
	stashPop,
	stashPush,
} from "../git-flow-utils.js";

export function printHelp() {
	console.log(`
${COLOR_BOLD}Git Flow Sync${COLOR_RESET}

Usage: bun scripts/git-flow.js sync [options]

Synchronize main/master and develop branches with remote.

Options:
  -h, --help                Show this help message
  --dry-run                 Print actions without executing
  --offline                 Skip remote operations

This command:
  1. Stashes any uncommitted changes
  2. Pulls latest changes for main/master
  3. Pulls latest changes for develop
  4. Merges main/master into develop
  5. Pushes both branches
  6. Restores original branch and stashed changes

Examples:
  bun scripts/git-flow.js sync
  bun scripts/git-flow.js sync --dry-run
  bun scripts/git-flow.js sync --offline
`);
}

export async function handleSync(opts) {
	const available = ensureGitFlowAvailable({
		...opts,
		autoInstall: false,
	});
	if (!available) {
		logError("git-flow is required for sync");
		process.exit(1);
	}

	ensureGitFlowInitialized();

	// Check for help flag before processing
	if (opts.help) {
		printHelp();
		return;
	}

	const { dryRun, offline } = opts;

	const base = detectMainBranch();
	const original = currentBranch();
	const stash = stashPush("git-flow-sync") || "";

	logInfo(`Using base branch: ${base}`);

	checkout(base, { dryRun });
	pullBranch(base, { dryRun, offline });
	pushBranch(base, { dryRun, offline });

	ensureBranchExists("develop");
	checkout("develop", { dryRun });
	pullBranch("develop", { dryRun, offline });
	mergeBranch(base, "develop", { dryRun });
	pushBranch("develop", { dryRun, offline });

	if (original && original !== "develop" && original !== base) {
		checkout(original, { dryRun });
	}

	if (stash && !stash.includes("No local changes")) {
		stashPop();
	}

	logSuccess("Sync complete");
}