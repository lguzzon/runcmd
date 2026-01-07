#!/usr/bin/env bun
import {
	COLOR_BOLD,
	COLOR_RESET,
	ensureBranchExists,
	ensureCleanTree,
	ensureGitFlowAvailable,
	ensureGitFlowInitialized,
	ensureTagMissing,
	logError,
	logInfo,
	logSuccess,
	logWarn,
	pullBranch,
	runGit,
	runGitFlow,
} from "../git-flow-utils.js";

export function printHelp() {
	console.log(`
${COLOR_BOLD}Git Flow Finish${COLOR_RESET}

Usage: bun scripts/git-flow.js finish <type> <name> [options]

Finish a branch and merge it back to the appropriate branches.

Arguments:
  type                      Branch type: feature, release, hotfix, support
  name                      Branch name

Options:
  --tag <tag>               Tag name for release/hotfix (required for release/hotfix)
  --message <msg>           Tag message (required for release/hotfix)
  --push                    Push branches and tags after finishing
  --keep-branch             Keep the branch after finishing
  --squash                  Squash commits when merging
  -h, --help                Show this help message
  --dry-run                 Print actions without executing
  --offline                 Skip remote operations

Examples:
  bun scripts/git-flow.js finish feature new-auth
  bun scripts/git-flow.js finish release v1.2.0 --tag v1.2.0 --message "Release 1.2.0"
  bun scripts/git-flow.js finish hotfix v1.1.1 --tag v1.1.1 --message "Hotfix 1.1.1" --push
`);
}

export async function handleFinish(opts) {
	const available = ensureGitFlowAvailable({
		...opts,
		autoInstall: false,
	});
	if (!available) {
		logError("git-flow is required to finish branches");
		process.exit(1);
	}

	ensureGitFlowInitialized();
	
	// Check for help flag before requiring clean tree
	if (opts.help) {
		printHelp();
		return;
	}
	
	ensureCleanTree();

	const { type, name, tag, message, push, keepBranch, squash, dryRun, offline } = opts;

	if (!type || !name) {
		logError("Both <type> and <name> are required");
		process.exit(1);
	}

	const branchName = `${type}/${name}`;
	ensureBranchExists(branchName);

	if ((type === "release" || type === "hotfix") && (!tag || !message)) {
		logError("--tag and --message are required for release/hotfix finish");
		process.exit(1);
	}

	if (tag) {
		ensureTagMissing(tag.replace(/^v/, ""));
	}

	if (!offline) {
		logInfo("Pulling latest changes...");
		pullBranch(branchName, { dryRun, offline });
		const base = type === "hotfix" || type === "support" ? "main" : "develop";
		ensureBranchExists(base);
		pullBranch(base, { dryRun, offline });
	}

	const flags = [];
	if (push && !offline) flags.push("-p");
	if (squash) flags.push("--squash");
	if (tag) flags.push(`-T ${tag}`);
	if (message) flags.push(`-m "${message}"`);

	const cmd = `${type} finish ${flags.join(" ")} ${name}`.trim();
	logInfo(`Finishing ${type} branch: ${branchName}`);
	runGitFlow(cmd, { dryRun });

	logSuccess(`${type} branch finalized: ${branchName}`);

	if (push && offline) {
		logWarn("--push ignored in offline mode");
	}

	if (!keepBranch && !dryRun) {
		logInfo(`Deleting branch: ${branchName}`);
		runGit(`branch -D ${branchName}`, { allowFail: true });
	} else if (keepBranch) {
		logInfo(`Keeping branch: ${branchName}`);
	}

	if (tag) {
		logSuccess(`Created tag: ${tag}`);
	}
}