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

async function handleReleaseStart(opts) {
	ensureCleanTree();
	ensureBranchExists("develop");

	const currentVersion = readVersion();
	const { name, bump, version, base, push, noChangelog, dryRun, offline } = opts;

	const newVersion = version || incrementVersion(currentVersion, bump || "minor");

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

	const branchName = `release/${name || newVersion}`;
	ensureBranchMissing(branchName);

	const baseBranch = base || "develop";
	if (!offline) {
		pullBranch(baseBranch, { dryRun, offline });
	}

	logInfo(`Starting release branch: ${branchName}`);
	runGitFlow(`release start ${name || newVersion} ${baseBranch}`, { dryRun });
	logSuccess(`Release branch started: ${branchName}`);

	updateVersionFile(newVersion, opts);
	commitChanges(newVersion, "release", opts);

	if (push) {
		runGit(`push -u origin ${branchName}`, { dryRun });
		logSuccess(`Pushed ${branchName}`);
	}

	logSuccess(`Release initialized: ${branchName} (version ${newVersion})`);
}

async function handleReleaseFinish(opts) {
	ensureCleanTree();
	ensureBranchExists("main");
	ensureBranchExists("develop");

	const { name, tag, message, push, keepBranch, dryRun, offline } = opts;

	if (!tag || !message) {
		logError("--tag and --message are required for release finish");
		process.exit(1);
	}

	ensureTagMissing(tag.replace(/^v/, ""));

	const branchName = `release/${name || tag.replace(/^v/, "")}`;
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

	const cmd = `release finish ${flags.join(" ")} ${name || tag.replace(/^v/, "")}`;
	logInfo(`Finishing release branch: ${branchName}`);
	runGitFlow(cmd, { dryRun });
	logSuccess(`Release branch finalized: ${branchName}`);

	if (push && offline) {
		logWarn("--push ignored in offline mode");
	}

	if (!keepBranch && !dryRun) {
		runGit(`branch -D ${branchName}`, { allowFail: true });
	}

	logSuccess(`Release completed: ${tag}`);
}

export async function handleRelease(action, opts) {
	const available = ensureGitFlowAvailable({
		...opts,
		autoInstall: false,
	});
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
		await handleReleaseStart(opts);
	} else if (action === "finish") {
		await handleReleaseFinish(opts);
	} else {
		logError(`Unknown release action: ${action}`);
		printHelp();
		process.exit(1);
	}
}