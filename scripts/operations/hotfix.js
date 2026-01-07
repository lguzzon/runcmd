#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
} from "../git-flow.js";
import { appendChangelog, commitChangelog } from "../lib/changelog.js";
import { validateVersion, parseVersion, incrementVersion, compareVersions, readVersion } from "../lib/version.js";
import { promptText } from "../lib/prompts.js";

const PROJECT_ROOT = process.cwd();
const VERSION_FILE = `${PROJECT_ROOT}/version.txt`;
const CHANGELOG_FILE = `${PROJECT_ROOT}/CHANGELOG.md`;

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

function updateVersionFile(version, { dryRun }) {
	if (!existsSync(VERSION_FILE)) {
		logError(`version.txt not found at ${VERSION_FILE}`);
		process.exit(1);
	}
	const lines = readFileSync(VERSION_FILE, "utf-8").split("\n");
	lines[0] = version;
	const nextContent = lines.join("\n");
	if (dryRun) {
		logInfo(`[dry-run] would write version.txt => ${version}`);
		return false;
	}
	writeFileSync(VERSION_FILE, nextContent, "utf-8");
	return true;
}

function commitChanges(version, type, { dryRun }) {
	const message = `chore: bump version to ${version} for ${type}`;
	runGit(`add ${VERSION_FILE}${existsSync(CHANGELOG_FILE) ? ` ${CHANGELOG_FILE}` : ""}`, { dryRun });
	runGit(`commit -m "${message}"`, { dryRun });
}

async function promptVersion(currentVersion, opts) {
	if (opts.version) {
		if (!validateVersion(opts.version)) {
			logError("--version must be semver x.y.z");
			process.exit(1);
		}
		return opts.version;
	}
	const bumped = incrementVersion(currentVersion, opts.bump);
	if (opts.yes) return bumped;
	const answer = await promptText(`Use version ${bumped}? [Y/n] `);
	if (!answer || answer.toLowerCase().startsWith("y")) return bumped;
	const custom = await promptText("Enter custom version (x.y.z): ");
	if (!validateVersion(custom)) {
		logError("Invalid version format");
		process.exit(1);
	}
	return custom;
}

async function handleHotfixStart(opts) {
	ensureCleanTree();
	ensureBranchExists("main");

	const currentVersion = readVersion();
	const { name, bump, version, base, push, noChangelog, dryRun, offline, yes } = opts;

	const newVersion = await promptVersion(currentVersion, { ...opts, bump: bump || "patch", version });

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

	const branchName = `hotfix/${name ? (name.startsWith('v') ? name : `v${name}`) : `v${newVersion}`}`;
	ensureBranchMissing(branchName);

	const baseBranch = base || "main";
	if (!offline) {
		pullBranch(baseBranch, { dryRun, offline });
	}

	logInfo(`Starting hotfix branch: ${branchName}`);
	const hotfixName = name ? (name.startsWith('v') ? name : `v${name}`) : `v${newVersion}`;
	runGitFlow(`hotfix start ${hotfixName} ${baseBranch}`, { dryRun });
	logSuccess(`Hotfix branch started: ${branchName}`);

	const versionChanged = updateVersionFile(newVersion, opts);
	let changelogChanged = false;
	if (!noChangelog) {
		changelogChanged = appendChangelog(newVersion, opts);
	}

	commitChanges(newVersion, "hotfix", opts);

	if (push) {
		runGit(`push -u origin ${branchName}`, { dryRun });
		logSuccess(`Pushed ${branchName}`);
	}

	logSuccess(`Hotfix initialized: ${branchName} (version ${newVersion})`);
	if (opts.dryRun) {
		logWarn("Dry-run completed. No changes were applied.");
	} else {
		if (!versionChanged && !changelogChanged) {
			logWarn("No files were changed (version/changelog). Check your inputs.");
		}
	}
}

async function handleHotfixFinish(opts) {
	ensureCleanTree();
	ensureBranchExists("main");
	ensureBranchExists("develop");

	const { name, tag, message, push, keepBranch, dryRun, offline, noChangelog } = opts;

	if (!tag || !message) {
		logError("--tag and --message are required for hotfix finish");
		process.exit(1);
	}

	ensureTagMissing(tag.replace(/^v/, ""));

	const branchName = `hotfix/${name ? (name.startsWith('v') ? name : `v${name}`) : tag}`;
	ensureBranchExists(branchName);

	if (!offline) {
		pullBranch(branchName, { dryRun, offline });
		pullBranch("develop", { dryRun, offline });
		pullBranch("main", { dryRun, offline });
	}

	// Ensure changelog present before merges so it propagates
	if (!noChangelog) {
		const version = tag.replace(/^v/, "");
		const existing = existsSync(CHANGELOG_FILE)
			? readFileSync(CHANGELOG_FILE, "utf-8")
			: "";
		if (!existing.includes(`## v${version}`)) {
			appendChangelog(version, opts);
			commitChangelog(version, opts);
		}
	}

	const flags = [];
	if (push && !offline) flags.push("-p");
	if (tag) flags.push(`-T ${tag}`);
	if (message) flags.push(`-m "${message}"`);

	const hotfixName = name ? (name.startsWith('v') ? name : `v${name}`) : tag;
	const cmd = `hotfix finish ${flags.join(" ")} ${hotfixName}`;
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