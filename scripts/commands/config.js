#!/usr/bin/env bun
import {
	COLOR_BOLD,
	COLOR_RESET,
	ensureGitFlowAvailable,
	ensureGitFlowInitialized,
	getGitFlowConfig,
	logError,
	logInfo,
	logSuccess,
	runGit,
} from "../git-flow-utils.js";

export function printHelp() {
	console.log(`
${COLOR_BOLD}Git Flow Config${COLOR_RESET}

Usage: bun scripts/git-flow.js config [options]

Get or set Git Flow configuration values.

Options:
  --get <key>               Get a configuration value
  --set <key> <value>       Set a configuration value
  --list                    List all Git Flow configuration
  -h, --help                Show this help message

Examples:
  bun scripts/git-flow.js config --list
  bun scripts/git-flow.js config --get gitflow.branch.master
  bun scripts/git-flow.js config --set gitflow.prefix.feature feature/
`);
}

export async function handleConfig(opts) {
	const available = ensureGitFlowAvailable({
		...opts,
		autoInstall: false,
	});
	if (!available) {
		logError("git-flow is required to manage configuration");
		process.exit(1);
	}

	ensureGitFlowInitialized();

	// Check for help flag before processing
	if (opts.help) {
		printHelp();
		return;
	}

	const { get: getKey, set: setKey, list } = opts;

	if (list) {
		const config = getGitFlowConfig();
		logSuccess("Git Flow configuration:");
		console.log(`  Master branch: ${config.master}`);
		console.log(`  Develop branch: ${config.develop}`);
		console.log(`  Feature prefix: ${config.featurePrefix}`);
		console.log(`  Release prefix: ${config.releasePrefix}`);
		console.log(`  Hotfix prefix: ${config.hotfixPrefix}`);
		console.log(`  Support prefix: ${config.supportPrefix}`);
		return;
	}

	if (getKey) {
		const value = runGit(`config --get ${getKey}`, { allowFail: true });
		if (value) {
			console.log(value);
		} else {
			logInfo(`Configuration key '${getKey}' not found.`);
		}
		return;
	}

	if (setKey) {
		const [key, value] = setKey;
		if (!key || !value) {
			logError("--set requires both <key> and <value>");
			process.exit(1);
		}
		runGit(`config ${key} ${value}`);
		logSuccess(`Set ${key} = ${value}`);
		return;
	}

	printHelp();
}