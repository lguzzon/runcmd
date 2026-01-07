#!/usr/bin/env bun
import { execSync } from "node:child_process";

// Re-export shared utilities for use by release scripts
export * from "./lib/version.js";
export * from "./lib/changelog.js";
export * from "./lib/prompts.js";

// ============================================================================
// Utility Functions (moved from git-flow-utils.js)
// ============================================================================

export const COLOR_INFO = "\x1b[32m";
export const COLOR_WARN = "\x1b[33m";
export const COLOR_ERROR = "\x1b[31m";
export const COLOR_RESET = "\x1b[0m";
export const COLOR_BOLD = "\x1b[1m";

export function logInfo(message) {
	console.log(`${COLOR_INFO}[INFO]${COLOR_RESET} ${message}`);
}

export function logWarn(message) {
	console.log(`${COLOR_WARN}[WARN]${COLOR_RESET} ${message}`);
}

export function logError(message) {
	console.error(`${COLOR_ERROR}[ERROR]${COLOR_RESET} ${message}`);
}

export function logSuccess(message) {
	console.log(`${COLOR_INFO}[OK]${COLOR_RESET} ${message}`);
}

export function runGit(
	args,
	{ allowFail = false, dryRun = false, pipeStdout = false } = {},
) {
	const cmd = `git ${args}`;
	if (dryRun) {
		logInfo(`[dry-run] ${cmd}`);
		return "";
	}
	try {
		return execSync(cmd, {
			encoding: "utf-8",
			stdio: ["pipe", pipeStdout ? "inherit" : "pipe", "pipe"],
		}).trim();
	} catch (error) {
		if (allowFail) return null;
		logError(`${cmd} failed`);
		if (error.stderr) console.error(error.stderr.toString());
		process.exit(1);
	}
}

export function ensureCleanTree() {
	const status = runGit("status --porcelain", { allowFail: true });
	if (status && status.length > 0) {
		logError(
			"Uncommitted changes detected. Please commit or stash them first.",
		);
		process.exit(1);
	}
}

export function ensureBranchExists(name) {
	const res = runGit(`show-ref --verify --quiet refs/heads/${name}`, {
		allowFail: true,
	});
	if (res === null) {
		logError(`Required branch '${name}' not found.`);
		process.exit(1);
	}
}

export function ensureBranchMissing(name) {
	const exists = runGit(`show-ref --verify --quiet refs/heads/${name}`, {
		allowFail: true,
	});
	if (exists !== null) {
		logError(`Branch '${name}' already exists.`);
		process.exit(1);
	}
}

export function detectMainBranch(remote = "origin") {
	const hasMain = runGit(`ls-remote --exit-code --heads ${remote} main`, {
		allowFail: true,
	});
	if (hasMain !== null) return "main";
	const hasMaster = runGit(`ls-remote --exit-code --heads ${remote} master`, {
		allowFail: true,
	});
	if (hasMaster !== null) return "master";
	return "main";
}

export function checkout(branch, opts = {}) {
	return runGit(`checkout ${branch}`, opts);
}

export function pullBranch(
	branch,
	{ dryRun = false, offline = false, allowFail = true } = {},
) {
	if (offline) return;
	checkout(branch, { dryRun });
	runGit(`pull --ff-only origin ${branch}`, { dryRun, allowFail });
}

export function pushBranch(branch, opts = {}) {
	return runGit(`push origin ${branch}`, { ...opts, allowFail: true });
}

export function mergeBranch(source, target, opts = {}) {
	checkout(target, opts);
	const res = runGit(`merge ${source} --no-ff --no-edit`, {
		...opts,
		allowFail: true,
		pipeStdout: true,
	});
	if (res === null && !opts.dryRun) {
		logError(
			`Merge of ${source} into ${target} failed. Resolve conflicts and retry.`,
		);
		process.exit(1);
	}
}

export function stashPush(message = "auto-stash") {
	return runGit(`stash push -m "${message}"`, { allowFail: true });
}

export function stashPop() {
	return runGit("stash pop", { allowFail: true });
}

export function currentBranch() {
	const name = runGit("rev-parse --abbrev-ref HEAD", { allowFail: true });
	return name || "";
}

export function promptYesNo(message, defaultYes = false) {
	if (process.env.CI === "true") return Promise.resolve(defaultYes);
	return promptText(`${message} ${defaultYes ? "[Y/n]" : "[y/N]"} `).then(
		(ans) => {
			if (!ans) return defaultYes;
			return ans.toLowerCase().startsWith("y");
		},
	);
}

export function promptText(question) {
	return new Promise((resolve) => {
		process.stdout.write(question);
		process.stdin.once("data", (data) => {
			resolve(data.toString().trim());
		});
	});
}

export function ensureTagMissing(version) {
	const tagName = version.startsWith("v") ? version : `v${version}`;
	const tags = runGit("tag -l", { allowFail: true }) || "";
	if (tags.split("\n").includes(tagName)) {
		logError(`Tag ${tagName} already exists.`);
		process.exit(1);
	}
}

export function withDryRunLabel(dryRun) {
	return dryRun ? `${COLOR_WARN}[dry-run]${COLOR_RESET} ` : "";
}

export function runGitFlow(
	args,
	{ allowFail = false, dryRun = false, pipeStdout = false } = {},
) {
	const cmd = `git flow ${args}`;
	if (dryRun) {
		logInfo(`[dry-run] ${cmd}`);
		return "";
	}
	try {
		return execSync(cmd, {
			encoding: "utf-8",
			stdio: ["pipe", pipeStdout ? "inherit" : "pipe", "pipe"],
		}).trim();
	} catch (error) {
		if (allowFail) return null;
		logError(`${cmd} failed`);
		if (error.stderr) console.error(error.stderr.toString());
		process.exit(1);
	}
}

export function getBranchType(branch) {
	if (!branch) return "unknown";
	if (branch.startsWith("feature/")) return "feature";
	if (branch.startsWith("release/")) return "release";
	if (branch.startsWith("hotfix/")) return "hotfix";
	if (branch.startsWith("support/")) return "support";
	if (branch === "main" || branch === "master") return "main";
	if (branch === "develop") return "develop";
	return "unknown";
}

export function validateBranchName(name, type) {
	const patterns = {
		feature: /^[\w-]+$/,
		release: /^[\w-]+$/,
		hotfix: /^[\w-]+$/,
		support: /^[\w-]+$/,
	};
	const pattern = patterns[type];
	if (!pattern) {
		logError(`Invalid branch type: ${type}`);
		return false;
	}
	if (!pattern.test(name)) {
		logError(
			`Invalid ${type} branch name: ${name}. Use alphanumeric characters, hyphens, and underscores only.`,
		);
		return false;
	}
	return true;
}

export function ensureGitFlowInitialized() {
	const config = runGit("config --get gitflow.branch.master", {
		allowFail: true,
	});
	if (!config) {
		logError(
			"Git Flow is not initialized. Run 'git flow init' or 'bun scripts/git-flow.js init' first.",
		);
		process.exit(1);
	}
}

export function getGitFlowConfig() {
	const master = runGit("config --get gitflow.branch.master", {
		allowFail: true,
	});
	const develop = runGit("config --get gitflow.branch.develop", {
		allowFail: true,
	});
	const featurePrefix = runGit("config --get gitflow.prefix.feature", {
		allowFail: true,
	});
	const releasePrefix = runGit("config --get gitflow.prefix.release", {
		allowFail: true,
	});
	const hotfixPrefix = runGit("config --get gitflow.prefix.hotfix", {
		allowFail: true,
	});
	const supportPrefix = runGit("config --get gitflow.prefix.support", {
		allowFail: true,
	});

	return {
		master: master || "master",
		develop: develop || "develop",
		featurePrefix: featurePrefix || "feature/",
		releasePrefix: releasePrefix || "release/",
		hotfixPrefix: hotfixPrefix || "hotfix/",
		supportPrefix: supportPrefix || "support/",
	};
}

export function listBranchesByType(type) {
	const config = getGitFlowConfig();
	const prefix = config[`${type}Prefix`];
	if (!prefix) {
		logError(`Unknown branch type: ${type}`);
		return [];
	}
	const branches = runGit(`branch --list "${prefix}*"`, { allowFail: true });
	if (!branches) return [];
	return branches
		.split("\n")
		.map((b) => b.replace("*", "").trim())
		.filter(Boolean);
}

export function ensureGitFlowAvailable({ autoInstall, offline, dryRun }) {
	const available = runGit("flow version", { allowFail: true, dryRun });
	if (available !== null) return true;
	if (offline) {
		logError("git-flow not available (offline). Install it first.");
		process.exit(1);
	}
	if (!autoInstall) {
		logWarn(
			"git-flow not found. Re-run with --auto-install to install it (may require sudo).",
		);
		return false;
	}
	if (dryRun) {
		logInfo("[dry-run] would install git-flow using upstream installer");
		return false;
	}
	logInfo("Installing git-flow (requires curl and sudo)...");
	try {
		execSync(
			"cd /tmp && curl --silent --location https://raw.githubusercontent.com/CJ-Systems/gitflow-cjs/develop/contrib/gitflow-installer.sh --output gitflow-installer.sh && sudo bash gitflow-installer.sh install develop && rm gitflow-installer.sh && sudo rm -rf gitflow",
			{ stdio: "inherit" },
		);
	} catch (error) {
		logError("git-flow installation failed");
		if (error.stderr) console.error(error.stderr.toString());
		process.exit(1);
	}
	logSuccess("git-flow installed");
	return true;
}

// Import command modules
import { handleInit as handleInitCommand, printHelp as printInitHelp } from "./commands/init.js";
import { handleStart as handleStartCommand, printHelp as printStartHelp } from "./commands/start.js";
import { handleFinish as handleFinishCommand, printHelp as printFinishHelp } from "./commands/finish.js";
import { handlePublish as handlePublishCommand, printHelp as printPublishHelp } from "./commands/publish.js";
import { handleTrack as handleTrackCommand, printHelp as printTrackHelp } from "./commands/track.js";
import { handleDelete as handleDeleteCommand, printHelp as printDeleteHelp } from "./commands/delete.js";
import { handleList as handleListCommand, printHelp as printListHelp } from "./commands/list.js";
import { handleConfig as handleConfigCommand, printHelp as printConfigHelp } from "./commands/config.js";

// Import operation modules
import { handleSync as handleSyncOperation, printHelp as printSyncHelp } from "./operations/sync.js";
import { handleClone as handleCloneOperation, printHelp as printCloneHelp } from "./operations/clone.js";
import { handleRelease as handleReleaseOperation, printHelp as printReleaseHelp } from "./operations/release.js";
import { handleHotfix as handleHotfixOperation, printHelp as printHotfixHelp } from "./operations/hotfix.js";

function printHelp() {
	console.log(`
${COLOR_BOLD}Git Flow helper${COLOR_RESET}

Usage: bun scripts/git-flow.js <command> [options]

${COLOR_BOLD}Core Commands:${COLOR_RESET}
  help                          Show this help message
  install [--auto-install]      Ensure git-flow is available; optionally install
  init                          Initialize git-flow in current repository
  config [--get|--set|--list]   Get or set Git Flow configuration

${COLOR_BOLD}Branch Commands:${COLOR_RESET}
  start <type> <name>           Start a new branch (feature/release/hotfix/support)
  finish <type> <name>          Finish and merge a branch
  publish <type> <name>         Publish a branch to remote
  track <type> <name>           Track a remote branch locally
  delete <type> <name>          Delete a branch
  list [type]                   List branches by type

${COLOR_BOLD}High-Level Operations:${COLOR_RESET}
  clone <url> [dir]             Clone repo and initialize git-flow
  sync [--offline] [--dry-run]  Sync main/master & develop (stash-safe)
  release <action>              Manage release branches (start/finish)
  hotfix <action>               Manage hotfix branches (start/finish)

${COLOR_BOLD}Examples:${COLOR_RESET}
  bun scripts/git-flow.js init
  bun scripts/git-flow.js start feature new-auth
  bun scripts/git-flow.js finish feature new-auth
  bun scripts/git-flow.js release start --bump minor
  bun scripts/git-flow.js hotfix finish --tag v1.1.1 --message "Hotfix"
  bun scripts/git-flow.js sync --dry-run

${COLOR_BOLD}For detailed help on any command:${COLOR_RESET}
  bun scripts/git-flow.js <command> --help
`);
}

function parseArgs(argv) {
	const args = [...argv];
	const next = () => args.shift();
	const takeValue = (flag) => {
		const v = next();
		if (!v) {
			logError(`${flag} requires a value`);
			process.exit(1);
		}
		return v;
	};

	const command = next();
	// Don't treat --help or -h as subcommands
	const nextArg = next();
	let sub = null;
	if (command && ["release", "hotfix", "start", "finish", "publish", "track", "delete"].includes(command)) {
		if (nextArg && nextArg !== "--help" && nextArg !== "-h") {
			sub = nextArg;
		} else if (nextArg === "--help" || nextArg === "-h") {
			// Put it back so it's caught by the help flag handler
			args.unshift(nextArg);
		}
	} else if (nextArg === "--help" || nextArg === "-h") {
		// Put it back for commands that don't have subcommands
		args.unshift(nextArg);
	}
	const opts = {
		command,
		sub,
		name: "nextRelease",
		base: null,
		force: false,
		tag: undefined,
		message: undefined,
		push: false,
		keepBranch: false,
		offline: false,
		dryRun: false,
		autoInstall: false,
		targetDir: undefined,
		cloneUrl: undefined,
		type: undefined,
		bump: undefined,
		version: undefined,
		fetch: false,
		squash: false,
		noChangelog: false,
		yes: false,
		get: undefined,
		set: undefined,
		list: false,
	};

	while (args.length) {
		const arg = next();
		switch (arg) {
			case "--name":
				opts.name = takeValue("--name");
				break;
			case "--base":
				opts.base = takeValue("--base");
				break;
			case "--force":
			case "-f":
				opts.force = true;
				break;
			case "--tag":
				opts.tag = takeValue("--tag");
				break;
			case "--message":
				opts.message = takeValue("--message");
				break;
			case "--push":
				opts.push = true;
				break;
			case "--keep-branch":
				opts.keepBranch = true;
				break;
			case "--offline":
				opts.offline = true;
				break;
			case "--dry-run":
				opts.dryRun = true;
				break;
			case "--auto-install":
				opts.autoInstall = true;
				break;
			case "--type":
				opts.type = takeValue("--type");
				break;
			case "--bump":
				opts.bump = takeValue("--bump");
				break;
			case "--version":
				opts.version = takeValue("--version");
				break;
			case "--fetch":
				opts.fetch = true;
				break;
			case "--squash":
				opts.squash = true;
				break;
			case "--no-changelog":
				opts.noChangelog = true;
				break;
			case "--yes":
				opts.yes = true;
				break;
			case "--get":
				opts.get = takeValue("--get");
				break;
			case "--set":
				opts.set = [takeValue("--set"), takeValue("value")];
				break;
			case "--list":
				// Only set list flag if not a command
				if (opts.command !== "list") {
					opts.list = true;
				}
				break;
			case "--help":
			case "-h":
				opts.help = true;
				break;
			default:
				if (!opts.cloneUrl) {
					opts.cloneUrl = arg;
				} else if (!opts.targetDir) {
					opts.targetDir = arg;
				} else if (!opts.type && ["feature", "release", "hotfix", "support"].includes(arg)) {
					opts.type = arg;
				} else if (!opts.name && arg !== "start" && arg !== "finish" && arg !== "publish" && arg !== "track" && arg !== "delete") {
					opts.name = arg;
				} else {
					logWarn(`Ignoring unknown argument: ${arg}`);
				}
		}
	}
	return opts;
}

function handleInstall(opts) {
	const available = ensureGitFlowAvailable(opts);
	if (!available) return;
	const inRepo =
		runGit("rev-parse --is-inside-work-tree", { allowFail: true }) === "true";
	if (inRepo) {
		logInfo("Initializing git-flow (default answers)...");
		runGit("flow init -d", { dryRun: opts.dryRun });
	} else {
		logWarn("Not inside a git repository; skipped git-flow init");
	}
}

async function main() {
	const argv = process.argv.slice(2);
	if (argv.length === 0) {
		printHelp();
		process.exit(0);
	}
	const opts = parseArgs(argv);

	// Handle help flag for any command
	if (opts.help) {
		switch (opts.command) {
			case "init":
				printInitHelp();
				break;
			case "start":
				printStartHelp();
				break;
			case "finish":
				printFinishHelp();
				break;
			case "publish":
				printPublishHelp();
				break;
			case "track":
				printTrackHelp();
				break;
			case "delete":
				printDeleteHelp();
				break;
			case "list":
				printListHelp();
				break;
			case "config":
				printConfigHelp();
				break;
			case "sync":
				printSyncHelp();
				break;
			case "clone":
				printCloneHelp();
				break;
			case "release":
				printReleaseHelp();
				break;
			case "hotfix":
				printHotfixHelp();
				break;
			default:
				printHelp();
		}
		return;
	}

	switch (opts.command) {
		case "help":
		case "--help":
		case "-h":
			printHelp();
			return;
		case "install":
			handleInstall(opts);
			return;
		case "init":
			await handleInitCommand(opts);
			return;
		case "start":
			await handleStartCommand(opts);
			return;
		case "finish":
			await handleFinishCommand(opts);
			return;
		case "publish":
			await handlePublishCommand(opts);
			return;
		case "track":
			await handleTrackCommand(opts);
			return;
		case "delete":
			await handleDeleteCommand(opts);
			return;
		case "list":
			await handleListCommand(opts);
			return;
		case "config":
			await handleConfigCommand(opts);
			return;
		case "clone":
			await handleCloneOperation(opts);
			return;
		case "sync":
			await handleSyncOperation(opts);
			return;
		case "release":
			await handleReleaseOperation(opts.sub, opts);
			return;
		case "hotfix":
			await handleHotfixOperation(opts.sub, opts);
			return;
		default:
			logError(`Unknown command: ${opts.command}`);
	}

	printHelp();
	process.exit(1);
}

// Only execute main() when this file is run directly, not when imported
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		logError(`Unexpected error: ${error.message}`);
		process.exit(1);
	});
}