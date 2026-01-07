#!/usr/bin/env bun
import {
	COLOR_BOLD,
	COLOR_RESET,
	ensureBranchExists,
	ensureBranchMissing,
	ensureCleanTree,
	ensureGitFlowAvailable,
	ensureGitFlowInitialized,
	getBranchType,
	logError,
	logInfo,
	logSuccess,
	logWarn,
	pullBranch,
	runGitFlow,
	validateBranchName,
} from "../git-flow-utils.js";

export function printHelp() {
	console.log(`
${COLOR_BOLD}Git Flow Start${COLOR_RESET}

Usage: bun scripts/git-flow.js start <type> <name> [options]

Start a new branch of the specified type.

Arguments:
  type                      Branch type: feature, release, hotfix, support
  name                      Branch name

Options:
  --base <branch>           Base branch to start from (default: develop for feature/release, main for hotfix)
  --fetch                   Fetch the base branch before starting
  -f, --force               Force start (delete existing branch if it exists)
  -h, --help                Show this help message
  --dry-run                 Print actions without executing
  --offline                 Skip remote fetches

Examples:
  bun scripts/git-flow.js start feature new-auth
  bun scripts/git-flow.js start release v1.2.0 --base develop
  bun scripts/git-flow.js start hotfix v1.1.1 --base main
  bun scripts/git-flow.js start support v1.0.x --base v1.0.0
`);
}

export async function handleStart(opts) {
	const available = ensureGitFlowAvailable({
		...opts,
		autoInstall: false,
	});
	if (!available) {
		logError("git-flow is required to start branches");
		process.exit(1);
	}

	ensureGitFlowInitialized();
	
	// Check for help flag before requiring clean tree
	if (opts.help) {
		printHelp();
		return;
	}
	
	ensureCleanTree();

	const { type, name, base, fetch, force, dryRun, offline } = opts;

	if (!type || !name) {
		logError("Both <type> and <name> are required");
		process.exit(1);
	}

	if (!validateBranchName(name, type)) {
		process.exit(1);
	}

	const config = runGitFlow("config", { allowFail: true, dryRun: false });
	const baseBranch =
		base ||
		(type === "hotfix" || type === "support" ? "main" : "develop");

	ensureBranchExists(baseBranch);

	if (fetch && !offline) {
		logInfo(`Fetching ${baseBranch}...`);
		pullBranch(baseBranch, { dryRun, offline });
	}

	const branchName = `${type}/${name}`;

	if (force) {
		logWarn(`Force mode: will delete existing branch ${branchName} if it exists`);
		runGit(`branch -D ${branchName}`, { allowFail: true, dryRun });
	} else {
		ensureBranchMissing(branchName);
	}

	const baseArg = base ? ` ${base}` : "";
	const cmd = `${type} start ${name}${baseArg}`;
	logInfo(`Starting ${type} branch: ${branchName}`);
	runGitFlow(cmd, { dryRun });

	logSuccess(`${type} branch started: ${branchName}`);

	if (!dryRun) {
		logInfo(`Switched to branch: ${branchName}`);
	}
}