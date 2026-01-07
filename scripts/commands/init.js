#!/usr/bin/env bun
import {
	COLOR_BOLD,
	COLOR_RESET,
	ensureGitFlowAvailable,
	logInfo,
	logSuccess,
	runGitFlow,
} from "../git-flow-utils.js";

export function printHelp() {
	console.log(`
${COLOR_BOLD}Git Flow Init${COLOR_RESET}

Usage: bun scripts/git-flow.js init [options]

Initialize git-flow in the current repository with default settings.

Options:
  -h, --help                Show this help message
  --dry-run                 Print actions without executing

Examples:
  bun scripts/git-flow.js init
  bun scripts/git-flow.js init --dry-run
`);
}

export async function handleInit(opts) {
	const available = ensureGitFlowAvailable({
		...opts,
		autoInstall: false,
	});
	if (!available) {
		logError("git-flow is required for init");
		process.exit(1);
	}

	logInfo("Initializing git-flow with default settings...");
	runGitFlow("init -d", { dryRun: opts.dryRun });
	logSuccess("git-flow initialized");

	const config = runGitFlow("config", { allowFail: true, dryRun: false });
	if (config) {
		logInfo("Git Flow configuration:");
		console.log(config);
	}
}