#!/usr/bin/env bun
import { execSync } from "node:child_process";
import {
	COLOR_BOLD,
	COLOR_RESET,
	checkout,
	currentBranch,
	detectMainBranch,
	ensureBranchExists,
	ensureBranchMissing,
	ensureCleanTree,
	ensureTagMissing,
	logError,
	logInfo,
	logSuccess,
	logWarn,
	mergeBranch,
	pullBranch,
	pushBranch,
	runGit,
	stashPop,
	stashPush,
} from "./git-flow-utils.js";

function printHelp() {
	console.log(`
${COLOR_BOLD}Git Flow helper${COLOR_RESET}

Usage: bun scripts/git-flow.js <command> [options]

Commands:
  help                          Show this help message
  install [--auto-install]      Ensure git-flow is available; optionally install
  init                          Run 'git flow init -d' in current repo
  clone <url> [dir]             Clone repo and initialize git-flow
  sync [--offline] [--dry-run]  Sync main/master & develop (stash-safe)
  release start [--name N] [--base B] [--force] [--offline] [--dry-run]
  release finish [--name N] --tag TAG --message MSG [--push] [--keep-branch] [--offline] [--dry-run]
  hotfix start|finish ...       Same as release but base defaults to main
  next-release --tag TAG --message MSG [--push] [--offline] [--dry-run]
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
	const sub =
		command && ["release", "hotfix"].includes(command) ? next() : null;
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
			default:
				if (!opts.cloneUrl) {
					opts.cloneUrl = arg;
				} else if (!opts.targetDir) {
					opts.targetDir = arg;
				} else {
					logWarn(`Ignoring unknown argument: ${arg}`);
				}
		}
	}
	return opts;
}

function ensureGitFlowAvailable({ autoInstall, offline, dryRun }) {
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

function handleInit(opts) {
	const available = ensureGitFlowAvailable({ ...opts, autoInstall: false });
	if (!available) {
		logError("git-flow is required for init");
		process.exit(1);
	}
	runGit("flow init -d", { dryRun: opts.dryRun });
	logSuccess("git-flow initialized");
}

function handleClone(opts) {
	if (!opts.cloneUrl) {
		logError("clone requires a repository URL");
		process.exit(1);
	}
	const target =
		opts.targetDir ||
		opts.cloneUrl
			.split("/")
			.pop()
			?.replace(/\.git$/, "") ||
		"repo";
	if (opts.dryRun) {
		logInfo(`[dry-run] git clone ${opts.cloneUrl} ${target}`);
		logInfo(`[dry-run] (in ${target}) git flow init -d`);
		return;
	}
	runGit(`clone ${opts.cloneUrl} ${target}`);
	logSuccess(`Cloned into ${target}`);
	runGit(`-C ${target} flow init -d`);
	logSuccess("git-flow initialized in clone");
}

function handleSync(opts) {
	const available = ensureGitFlowAvailable({ ...opts, autoInstall: false });
	if (!available) {
		logError("git-flow is required for sync");
		process.exit(1);
	}
	const base = detectMainBranch();
	const original = currentBranch();
	const stash = stashPush("git-flow-sync") || "";
	logInfo(`Using base branch: ${base}`);

	checkout(base, opts);
	pullBranch(base, opts);
	pushBranch(base, opts);

	ensureBranchExists("develop");
	checkout("develop", opts);
	pullBranch("develop", opts);
	mergeBranch(base, "develop", opts);
	pushBranch("develop", opts);

	if (original && original !== "develop" && original !== base) {
		checkout(original, opts);
	}
	if (stash && !stash.includes("No local changes")) {
		stashPop();
	}
	logSuccess("Sync complete");
}

function handleReleaseStart(opts, type = "release") {
	const available = ensureGitFlowAvailable({ ...opts, autoInstall: false });
	if (!available) {
		logError("git-flow is required to start branches");
		process.exit(1);
	}
	ensureCleanTree();
	const base =
		opts.base || (type === "hotfix" ? detectMainBranch() : "develop");
	ensureBranchExists(base);
	if (!opts.offline) pullBranch(base, opts);

	const branchName = `${type}/${opts.name}`;
	if (opts.force) {
		runGit(`branch -D ${branchName}`, { allowFail: true, dryRun: opts.dryRun });
	} else {
		ensureBranchMissing(branchName);
	}

	const baseArg = base ? ` ${base}` : "";
	runGit(`flow ${type} start ${opts.name}${baseArg}`, { dryRun: opts.dryRun });
	logSuccess(`${type} branch started: ${branchName}`);
}

function buildFinishCommand(type, opts) {
	const flags = [];
	if (opts.push && !opts.offline) flags.push("-p");
	if (opts.tag) flags.push(`-T ${opts.tag}`);
	if (opts.message) flags.push(`-m "${opts.message}"`);
	return `flow ${type} finish ${flags.join(" ")} ${opts.name}`.trim();
}

function handleReleaseFinish(opts, type = "release") {
	const available = ensureGitFlowAvailable({ ...opts, autoInstall: false });
	if (!available) {
		logError("git-flow is required to finish branches");
		process.exit(1);
	}
	ensureCleanTree();
	if (!opts.tag || !opts.message) {
		logError("--tag and --message are required for finish");
		process.exit(1);
	}
	ensureTagMissing(opts.tag.replace(/^v/, ""));

	const branch = `${type}/${opts.name}`;
	ensureBranchExists(branch);
	if (!opts.offline) {
		pullBranch(branch, opts);
		pullBranch("develop", opts);
		const base = type === "hotfix" ? detectMainBranch() : "develop";
		ensureBranchExists(base);
		pullBranch(base, opts);
	}

	const cmd = buildFinishCommand(type, opts);
	runGit(cmd, { dryRun: opts.dryRun });
	logSuccess(`${type} branch finalized: ${branch}`);

	if (opts.push && opts.offline) {
		logWarn("--push ignored in offline mode");
	}
	if (!opts.keepBranch && !opts.dryRun) {
		runGit(`branch -d ${branch}`, { allowFail: true });
	}
}

function handleNextRelease(opts) {
	handleReleaseStart(opts, "release");
	handleReleaseFinish({ ...opts, name: opts.name || "nextRelease" }, "release");
}

function main() {
	const argv = process.argv.slice(2);
	if (argv.length === 0) {
		printHelp();
		process.exit(0);
	}
	const opts = parseArgs(argv);

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
			handleInit(opts);
			return;
		case "clone":
			handleClone(opts);
			return;
		case "sync":
			handleSync(opts);
			return;
		case "release":
			if (opts.sub === "start") return handleReleaseStart(opts, "release");
			if (opts.sub === "finish") return handleReleaseFinish(opts, "release");
			break;
		case "hotfix":
			if (opts.sub === "start") return handleReleaseStart(opts, "hotfix");
			if (opts.sub === "finish") return handleReleaseFinish(opts, "hotfix");
			break;
		case "next-release":
			return handleNextRelease(opts);
		default:
			logError(`Unknown command: ${opts.command}`);
	}

	printHelp();
	process.exit(1);
}

main();
