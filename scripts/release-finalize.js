#!/usr/bin/env bun
import { handleRelease } from "./operations/release.js";
import { handleHotfix } from "./operations/hotfix.js";
import { ensureBranchExists, ensureCleanTree, runGit } from "./git-flow.js";
import { promptTextSync } from "./lib/prompts.js";

const defaults = {
	type: undefined, // release|hotfix (auto-detect)
	branch: undefined,
	push: false,
	dryRun: false,
	yes: false,
	noChangelog: false,
	keepBranch: false,
	json: false,
	offline: false,
	help: false,
};

const operations = [];

function log(type, message) {
	const map = {
		info: "\x1b[32m",
		warn: "\x1b[33m",
		error: "\x1b[31m",
		success: "\x1b[32m",
	};
	const prefix = map[type] || "\x1b[32m";
	const reset = "\x1b[0m";
	const tag = type === "success" ? "OK" : type.toUpperCase();
	const line = `${prefix}[${tag}]${reset} ${message}`;
	if (type === "error") {
		console.error(line);
	} else {
		console.log(line);
	}
	operations.push({ type, message });
}

function logInfo(m) {
	log("info", m);
}
function logWarn(m) {
	log("warn", m);
}
function logError(m) {
	log("error", m);
}
function logSuccess(m) {
	log("success", m);
}

function parseArgs() {
	const args = process.argv.slice(2);
	const opts = { ...defaults };
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		switch (arg) {
			case "--type":
				opts.type = args[++i];
				break;
			case "--branch":
				opts.branch = args[++i];
				break;
			case "--push":
				opts.push = true;
				break;
			case "--dry-run":
				opts.dryRun = true;
				break;
			case "--yes":
				opts.yes = true;
				break;
			case "--no-changelog":
				opts.noChangelog = true;
				break;
			case "--keep-branch":
				opts.keepBranch = true;
				break;
			case "--json":
				opts.json = true;
				break;
			case "--offline":
				opts.offline = true;
				break;
			case "--help":
			case "-h":
				opts.help = true;
				break;
			default:
				// Ignore unknown arguments for backward compatibility
				break;
		}
	}
	if (process.env.CI === "true") {
		opts.yes = true;
	}
	return opts;
}

function printHelp() {
	console.log(`
${"\x1b[1m"}Git Flow Release/Hotfix Finalizer${"\x1b[0m"}

Usage: bun scripts/release-finalize.js [options]

Options:
  --type <release|hotfix>   Branch type (auto-detect if omitted)
  --branch <name>           Branch to finalize (release/* or hotfix/*)
  --push                    Push branches/tags
  --dry-run                 Print planned actions only
  --no-changelog            Skip changelog update
  --keep-branch             Do not delete release/hotfix branch
  --json                    Emit JSON summary to stdout
  --offline                 Skip pulls/fetches
  --yes                     Non-interactive
  -h, --help                Show help

Examples:
  bun scripts/release-finalize.js --type release --branch release/v1.2.0
  bun scripts/release-finalize.js --push --yes
`);
}

function listBranches(glob) {
	const out = runGit(`branch --list "${glob}"`, { allowFail: true });
	if (!out) return [];
	return out
		.split("\n")
		.map((b) => b.replace("*", "").trim())
		.filter(Boolean);
}

function detectBranch(opts) {
	if (opts.branch) return opts.branch;

	const releases = listBranches("release/*");
	const hotfixes = listBranches("hotfix/*");

	const candidates = [];
	if (!opts.type || opts.type === "release") candidates.push(...releases);
	if (!opts.type || opts.type === "hotfix") candidates.push(...hotfixes);

	if (candidates.length === 0) {
		logError("No release/hotfix branches found.");
		process.exit(1);
	}

	if (candidates.length === 1) return candidates[0];

	if (opts.yes || process.env.CI === "true") {
		logError("Multiple branches found; specify --branch.");
		process.exit(1);
	}

	console.log("\nSelect branch to finalize:");
	candidates.forEach((b, idx) => {
		console.log(`  ${idx + 1}. ${b}`);
	});
	const answer = promptTextSync("Enter choice: ");
	const index = Number(answer) - 1;
	if (Number.isNaN(index) || index < 0 || index >= candidates.length) {
		logError("Invalid selection");
		process.exit(1);
	}
	return candidates[index];
}

function branchType(branch) {
	if (branch.startsWith("release/")) return "release";
	if (branch.startsWith("hotfix/")) return "hotfix";
	return "unknown";
}

function ensureBranchMatchesType(branch, requested) {
	const detected = branchType(branch);
	if (requested && requested !== detected) {
		logError(`Branch '${branch}' does not match type '${requested}'.`);
		process.exit(1);
	}
	if (detected === "unknown") {
		logError("Branch must be release/* or hotfix/*");
		process.exit(1);
	}
	return detected;
}

function generateJsonSummary(status, branch, version) {
	return JSON.stringify({
		status,
		branch,
		version,
		operations,
	});
}

async function main() {
	const opts = parseArgs();

	if (opts.help) {
		printHelp();
		process.exit(0);
	}

	ensureCleanTree();
	ensureBranchExists("main");
	ensureBranchExists("develop");

	const targetBranch = detectBranch(opts);
	const detectedType = ensureBranchMatchesType(targetBranch, opts.type);

	// Extract version from branch name for tag and message
	const versionMatch = targetBranch.match(/v(\d+\.\d+\.\d+)$/);
	if (!versionMatch) {
		logError("Branch name must include version (e.g., release/v1.2.0)");
		process.exit(1);
	}
	const version = versionMatch[1];

	// Set required options for git-flow operations
	opts.name = version;
	opts.tag = `v${version}`;
	opts.message = `Release version ${version}`;

	// Map to git-flow.js operation
	const action = "finish";

	if (detectedType === "hotfix") {
		await handleHotfix(action, opts);
	} else {
		await handleRelease(action, opts);
	}

	logSuccess("Release/hotfix finalized.");
	console.log(`\n${"\x1b[1m"}Version:${"\x1b[0m"} ${version}`);
	console.log(`${"\x1b[1m"}Branch:${"\x1b[0m"} ${targetBranch}`);

	if (opts.json) {
		console.log(generateJsonSummary("ok", targetBranch, version));
	}

	// Close stdin to prevent hanging
	process.stdin.pause();
}

main().catch((error) => {
	logError(`Unexpected error: ${error.message}`);
	if (defaults.json) {
		console.log(generateJsonSummary("error", "", ""));
	}
	process.exit(1);
});