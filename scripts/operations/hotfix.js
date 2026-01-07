#!/usr/bin/env bun
import {
	COLOR_BOLD,
	COLOR_RESET,
	ensureBranchExists,
	ensureBranchMissing,
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
${COLOR_BOLD}Git Flow Hotfix${COLOR_RESET}

Usage: bun scripts/git-flow.js hotfix <action> [options]

Manage hotfix branches with automatic version bumping.

Actions:
  start                     Start a new hotfix branch
  finish                    Finish and merge a hotfix branch

Start Options:
  --name <name>             Hotfix name (default: nextHotfix)
  --bump <patch>            Auto bump from current version (default: patch)
  --version <x.y.z>         Explicit version
  --base <branch>           Base branch (default: main)
  --push                    Push new branch and commit
  --no-changelog            Skip changelog update

Finish Options:
  --name <name>             Hotfix name (default: nextHotfix)
  --tag <tag>               Tag name (required)
  --message <msg>           Tag message (required)
  --push                    Push branches and tags
  --keep-branch             Keep the hotfix branch

Common Options:
  -h, --help                Show this help message
  --dry-run                 Print actions without executing
  --offline                 Skip remote operations
  --yes                     Non-interactive mode

Examples:
  bun scripts/git-flow.js hotfix start --bump patch
  bun scripts/git-flow.js hotfix start --version 1.1.1
  bun scripts/git-flow.js hotfix finish --tag v1.1.1 --message "Hotfix 1.1.1" --push
`);
}

function validateVersion(version) {
	return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version);
}

function parseVersion(version) {
	const [major, minor, patch] = version.split(".").map(Number);
	return { major, minor, patch };
}

function incrementVersion(version, bump) {
	const { major, minor, patch } = parseVersion(version);
	switch ((bump || "").toLowerCase()) {
		case "major":
			return `${major + 1}.0.0`;
		case "minor":
			return `${major}.${minor + 1}.0`;
		case "patch":
			return `${major}.${minor}.${patch + 1}`;
		default:
			return version;
	}
}

function compareVersions(a, b) {
	const pa = a.split(".").map(Number);
	const pb = b.split(".").map(Number);
	for (let i = 0; i < 3; i++) {
		if (pa[i] > pb[i]) return 1;
		if (pa[i] < pb[i]) return -1;
	}
	return 0;
}

function readVersion() {
	const version = runGit("show HEAD:version.txt", { allowFail: true });
	if (!version) {
		logError("version.txt not found in repository");
		process.exit(1);
	}
	const versionLine = version.trim().split("\n")[0].trim();
	if (!validateVersion(versionLine)) {
		logError(`Invalid version format in version.txt: ${versionLine}`);
		process.exit(1);
	}
	return versionLine;
}

function updateVersionFile(version, { dryRun }) {
	const content = runGit("show HEAD:version.txt", { allowFail: true });
	if (!content) {
		logError("version.txt not found in repository");
		process.exit(1);
	}
	const lines = content.split("\n");
	lines[0] = version;
	const nextContent = lines.join("\n");
	if (dryRun) {
		logInfo(`[dry-run] would write version.txt => ${version}`);
		return false;
	}
	runGit(`write-tree`, { allowFail: true });
	return true;
}

function commitChanges(version, type, { dryRun }) {
	const message = `chore: bump version to ${version} for ${type}`;
	runGit(`add version.txt`, { dryRun });
	runGit(`commit -m "${message}"`, { dryRun });
}

async function handleHotfixStart(opts) {
	ensureCleanTree();
	ensureBranchExists("main");

	const currentVersion = readVersion();
	const { name, bump, version, base, push, noChangelog, dryRun, offline } = opts;

	const newVersion = version || incrementVersion(currentVersion, bump || "patch");

	if (!validateVersion(newVersion)) {
		logError("Invalid version format");
		process.exit(1);
	}

	if (compareVersions(newVersion, currentVersion) < 0) {
		logError(
			`New version ${newVersion} cannot be lower than current ${currentVersion}`,
		);
		process.exit(1);
	}

	const branchName = `hotfix/${name || newVersion}`;
	ensureBranchMissing(branchName);

	const baseBranch = base || "main";
	if (!offline) {
		pullBranch(baseBranch, { dryRun, offline });
	}

	logInfo(`Starting hotfix branch: ${branchName}`);
	runGitFlow(`hotfix start ${name || newVersion} ${baseBranch}`, { dryRun });
	logSuccess(`Hotfix branch started: ${branchName}`);

	updateVersionFile(newVersion, opts);
	commitChanges(newVersion, "hotfix", opts);

	if (push) {
		runGit(`push -u origin ${branchName}`, { dryRun });
		logSuccess(`Pushed ${branchName}`);
	}

	logSuccess(`Hotfix initialized: ${branchName} (version ${newVersion})`);
}

async function handleHotfixFinish(opts) {
	ensureCleanTree();
	ensureBranchExists("main");
	ensureBranchExists("develop");

	const { name, tag, message, push, keepBranch, dryRun, offline } = opts;

	if (!tag || !message) {
		logError("--tag and --message are required for hotfix finish");
		process.exit(1);
	}

	ensureTagMissing(tag.replace(/^v/, ""));

	const branchName = `hotfix/${name || tag.replace(/^v/, "")}`;
	ensureBranchExists(branchName);

	if (!offline) {
		pullBranch(branchName, { dryRun, offline });
		pullBranch("develop", { dryRun, offline });
		pullBranch("main", { dryRun, offline });
	}

	const flags = [];
	if (push && !offline) flags.push("-p");
	if (tag) flags.push(`-T ${tag}`);
	if (message) flags.push(`-m "${message}"`);

	const cmd = `hotfix finish ${flags.join(" ")} ${name || tag.replace(/^v/, "")}`;
	logInfo(`Finishing hotfix branch: ${branchName}`);
	runGitFlow(cmd, { dryRun });
	logSuccess(`Hotfix branch finalized: ${branchName}`);

	if (push && offline) {
		logWarn("--push ignored in offline mode");
	}

	if (!keepBranch && !dryRun) {
		runGit(`branch -D ${branchName}`, { allowFail: true });
	}

	logSuccess(`Hotfix completed: ${tag}`);
}

export async function handleHotfix(action, opts) {
	const available = ensureGitFlowAvailable({
		...opts,
		autoInstall: false,
	});
	if (!available) {
		logError("git-flow is required for hotfix operations");
		process.exit(1);
	}

	ensureGitFlowInitialized();

	// Check for help flag before processing
	if (opts.help) {
		printHelp();
		return;
	}

	if (action === "start") {
		await handleHotfixStart(opts);
	} else if (action === "finish") {
		await handleHotfixFinish(opts);
	} else {
		logError(`Unknown hotfix action: ${action}`);
		printHelp();
		process.exit(1);
	}
}