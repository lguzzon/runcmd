#!/usr/bin/env bun
import {
	COLOR_BOLD,
	COLOR_RESET,
	ensureGitFlowAvailable,
	logError,
	logInfo,
	logSuccess,
	runGit,
	runGitFlow,
} from "../git-flow-utils.js";

export function printHelp() {
	console.log(`
${COLOR_BOLD}Git Flow Clone${COLOR_RESET}

Usage: bun scripts/git-flow.js clone <url> [dir] [options]

Clone a repository and initialize git-flow.

Arguments:
  url                       Repository URL to clone
  dir                       Target directory (optional, defaults to repo name)

Options:
  -h, --help                Show this help message
  --dry-run                 Print actions without executing

Examples:
  bun scripts/git-flow.js clone https://github.com/user/repo.git
  bun scripts/git-flow.js clone https://github.com/user/repo.git my-repo
  bun scripts/git-flow.js clone https://github.com/user/repo.git --dry-run
`);
}

export async function handleClone(opts) {
	const available = ensureGitFlowAvailable({
		...opts,
		autoInstall: false,
	});
	if (!available) {
		logError("git-flow is required for clone");
		process.exit(1);
	}

	// Check for help flag before processing
	if (opts.help) {
		printHelp();
		return;
	}

	const { cloneUrl, targetDir, dryRun } = opts;

	if (!cloneUrl) {
		logError("clone requires a repository URL");
		process.exit(1);
	}

	const target =
		targetDir ||
		cloneUrl
			.split("/")
			.pop()
			?.replace(/\.git$/, "") ||
		"repo";

	if (dryRun) {
		logInfo(`[dry-run] git clone ${cloneUrl} ${target}`);
		logInfo(`[dry-run] (in ${target}) git flow init -d`);
		return;
	}

	logInfo(`Cloning repository: ${cloneUrl}`);
	runGit(`clone ${cloneUrl} ${target}`);
	logSuccess(`Cloned into ${target}`);

	logInfo(`Initializing git-flow in ${target}...`);
	runGit(`-C ${target} flow init -d`);
	logSuccess("git-flow initialized in clone");
}