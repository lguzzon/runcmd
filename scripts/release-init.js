#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const PROJECT_ROOT = process.cwd();
const VERSION_FILE = `${PROJECT_ROOT}/version.txt`;
const CHANGELOG_FILE = `${PROJECT_ROOT}/CHANGELOG.md`;

const COLOR_INFO = "\x1b[32m";
const COLOR_WARN = "\x1b[33m";
const COLOR_ERROR = "\x1b[31m";
const COLOR_RESET = "\x1b[0m";
const COLOR_BOLD = "\x1b[1m";

const defaultOptions = {
  type: "release", // release|hotfix
  bump: undefined, // patch|minor|major
  version: undefined,
  push: false,
  dryRun: false,
  yes: false,
  noChangelog: false,
  offline: false,
};

function logInfo(message) {
  console.log(`${COLOR_INFO}[INFO]${COLOR_RESET} ${message}`);
}

function logWarn(message) {
  console.log(`${COLOR_WARN}[WARN]${COLOR_RESET} ${message}`);
}

function logError(message) {
  console.error(`${COLOR_ERROR}[ERROR]${COLOR_RESET} ${message}`);
}

function logSuccess(message) {
  console.log(`${COLOR_INFO}[OK]${COLOR_RESET} ${message}`);
}

function runGit(args, { allowFail = false, dryRun = false } = {}) {
  if (dryRun) {
    logInfo(`[dry-run] git ${args}`);
    return "";
  }
  try {
    return execSync(`git ${args}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    if (allowFail) return null;
    logError(`git ${args} failed`);
    if (error.stderr) console.error(error.stderr.toString());
    process.exit(1);
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { ...defaultOptions };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--type":
        opts.type = args[++i] || opts.type;
        break;
      case "--bump":
        opts.bump = args[++i];
        break;
      case "--version":
        opts.version = args[++i];
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
      case "--offline":
        opts.offline = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        logWarn(`Unknown option: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }

  if (process.env.CI === "true") {
    opts.yes = true;
  }

  if (!opts.bump && !opts.version) {
    opts.bump = opts.type === "hotfix" ? "patch" : "minor";
  }

  return opts;
}

function printHelp() {
  console.log(`
${COLOR_BOLD}Git Flow Release/Hotfix Initiator${COLOR_RESET}

Usage: bun scripts/release-init.js [options]

Options:
  --type <release|hotfix>   Branch type (default: release)
  --bump <patch|minor|major> Auto bump from current version
  --version <x.y.z>         Explicit version
  --push                    Push new branch and commit
  --dry-run                 Print actions without executing
  --no-changelog            Skip changelog update
  --offline                 Skip remote checks/pulls
  --yes                     Non-interactive (assume yes)
  -h, --help                Show help
`);
}

function validateVersion(version) {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version);
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
  if (!existsSync(VERSION_FILE)) {
    logError(`version.txt not found at ${VERSION_FILE}`);
    process.exit(1);
  }
  const version = readFileSync(VERSION_FILE, "utf-8").trim().split("\n")[0].trim();
  if (!validateVersion(version)) {
    logError(`Invalid version format in version.txt: ${version}`);
    process.exit(1);
  }
  return version;
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

async function promptYesNo(message, defaultYes = false) {
  if (process.env.CI === "true") return defaultYes;
  return await promptText(`${message} ${defaultYes ? "[Y/n]" : "[y/N]"} `)
    .then((ans) => {
      if (!ans) return defaultYes;
      return ans.toLowerCase().startsWith("y");
    });
}

async function promptText(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.once("data", (data) => {
      resolve(data.toString().trim());
    });
  });
}

function ensureCleanTree() {
  const status = runGit("status --porcelain", { allowFail: true });
  if (status && status.length > 0) {
    logError("Uncommitted changes detected. Please commit or stash them first.");
    process.exit(1);
  }
}

function ensureBranchExists(name) {
  const res = runGit(`show-ref --verify --quiet refs/heads/${name}`, { allowFail: true });
  if (res === null) {
    logError(`Required branch '${name}' not found.`);
    process.exit(1);
  }
}

function ensureBranchMissing(name) {
  const exists = runGit(`show-ref --verify --quiet refs/heads/${name}`, { allowFail: true });
  if (exists !== null) {
    logError(`Branch '${name}' already exists.`);
    process.exit(1);
  }
}

function pullBranch(name, { dryRun, offline }) {
  if (offline) return;
  runGit(`checkout ${name}`, { dryRun });
  runGit(`pull --ff-only origin ${name}`, { dryRun, allowFail: true });
}

function createBranch(base, branch, { dryRun }) {
  runGit(`checkout ${base}`, { dryRun });
  runGit(`checkout -b ${branch}`, { dryRun });
}

function updateVersionFile(version, { dryRun }) {
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

function getLastTag() {
  const tag = runGit("describe --tags --abbrev=0", { allowFail: true });
  return tag || null;
}

function collectCommitsSince(ref) {
  const range = ref ? `${ref}..HEAD` : "HEAD";
  const commits = runGit(`log ${range} --pretty=format:"- %s"`, { allowFail: true });
  if (!commits) return [];
  return commits.split("\n").filter(Boolean);
}

function appendChangelog(version, { dryRun }) {
  const existing = existsSync(CHANGELOG_FILE) ? readFileSync(CHANGELOG_FILE, "utf-8") : "";
  if (existing.includes(`## v${version}`)) {
    logInfo("Changelog already contains this version. Skipping.");
    return false;
  }
  const lastTag = getLastTag();
  const commits = collectCommitsSince(lastTag);
  const date = new Date().toISOString().slice(0, 10);
  const sectionLines = [
    `## v${version} - ${date}`,
    commits.length ? commits.join("\n") : "- Internal changes",
    "",
  ];
  const nextContent = `${sectionLines.join("\n")}${existing}`;
  if (dryRun) {
    logInfo(`[dry-run] would update CHANGELOG.md with v${version}`);
    return false;
  }
  writeFileSync(CHANGELOG_FILE, nextContent, "utf-8");
  return true;
}

function commitChanges(version, type, { dryRun }) {
  const message = `chore: bump version to ${version} for ${type}`;
  runGit(`add ${VERSION_FILE}${existsSync(CHANGELOG_FILE) ? ` ${CHANGELOG_FILE}` : ""}`, { dryRun });
  runGit(`commit -m "${message}"`, { dryRun });
}

function pushBranch(branch, { dryRun }) {
  runGit(`push -u origin ${branch}`, { dryRun });
}

async function ensureBaseBranch(type, opts) {
  const base = type === "hotfix" ? "main" : "develop";
  ensureBranchExists(base);
  if (!opts.offline) pullBranch(base, opts);
  return base;
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

function ensureVersionProgress(currentVersion, newVersion) {
  if (compareVersions(newVersion, currentVersion) < 0) {
    logError(`New version ${newVersion} cannot be lower than current ${currentVersion}`);
    process.exit(1);
  }
}

function summarize(branch, version, type, opts) {
  console.log(`\n${COLOR_BOLD}Branch created:${COLOR_RESET} ${branch}`);
  console.log(`${COLOR_BOLD}Version:${COLOR_RESET} ${version}`);
  console.log(`${COLOR_BOLD}Type:${COLOR_RESET} ${type}`);
  console.log("\nNext steps:");
  console.log("  - Implement changes on the release/hotfix branch");
  console.log("  - Test and stabilize");
  console.log("  - Finalize with: bun scripts/release-finalize.js" + (opts.dryRun ? " (after removing --dry-run)" : ""));
}

async function main() {
  console.log(`${COLOR_BOLD}Git Flow Release/Hotfix Initiator${COLOR_RESET}\n`);
  const opts = parseArgs();

  ensureCleanTree();
  ensureBranchExists("main");
  ensureBranchExists("develop");

  const currentVersion = readVersion();
  const base = await ensureBaseBranch(opts.type, opts);
  const newVersion = await promptVersion(currentVersion, opts);
  ensureVersionProgress(currentVersion, newVersion);

  const branchName = `${opts.type === "hotfix" ? "hotfix" : "release"}/v${newVersion}`;
  ensureBranchMissing(branchName);

  createBranch(base, branchName, opts);

  const versionChanged = updateVersionFile(newVersion, opts);
  let changelogChanged = false;
  if (!opts.noChangelog) {
    changelogChanged = appendChangelog(newVersion, opts);
  }

  commitChanges(newVersion, opts.type, opts);

  if (opts.push) {
    pushBranch(branchName, opts);
  }

  summarize(branchName, newVersion, opts.type, opts);

  if (opts.dryRun) {
    logWarn("Dry-run completed. No changes were applied.");
  } else {
    logSuccess("Release/hotfix branch initialized.");
    if (!versionChanged && !changelogChanged) {
      logWarn("No files were changed (version/changelog). Check your inputs.");
    }
  }
}

main().catch((error) => {
  logError(`Unexpected error: ${error.message}`);
  process.exit(1);
});
