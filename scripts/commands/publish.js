#!/usr/bin/env bun
import {
	COLOR_BOLD,
	COLOR_RESET,
	ensureBranchExists,
	ensureGitFlowAvailable,
	ensureGitFlowInitialized,
	logError,
	logInfo,
	logSuccess,
	runGitFlow,
} from "../git-flow-utils.js";

export function printHelp() {
	console.log(`
${COLOR_BOLD}Git Flow Publish${COLOR_RESET}

Usage: bun scripts/git-flow.js publish <type> <name> [options]

Publish a branch to the remote repository.

Arguments:
  type                      Branch type: feature, release, hotfix, support
  name                      Branch name

Options:
  -h, --help                Show this help message
  --dry-run                 Print actions without executing

Examples:
  bun scripts/git-flow.js publish feature new-auth
  bun scripts/git-flow.js publish release v1.2.0
`);
}

export async function handlePublish(opts) {
	const available = ensureGitFlowAvailable({
		...opts,
		autoInstall: false,
	});
	if (!available) {
		logError("git-flow is required to publish branches");
		process.exit(1);
	}

	ensureGitFlowInitialized();

	// Check for help flag before requiring arguments
	if (opts.help) {
		printHelp();
		return;
	}

	const { type, name, dryRun } = opts;

	if (!type || !name) {
		logError("Both <type> and <name> are required");
		process.exit(1);
	}

	const branchName = `${type}/${name}`;
	ensureBranchExists(branchName);

	logInfo(`Publishing ${type} branch: ${branchName}`);
	runGitFlow(`${type} publish ${name}`, { dryRun });

	logSuccess(`${type} branch published: ${branchName}`);
}