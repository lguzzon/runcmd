#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync, readSync } from "fs";
import { execSync } from "child_process";

const PROJECT_ROOT = process.cwd();
const VERSION_FILE = `${PROJECT_ROOT}/version.txt`;
const CHANGELOG_FILE = `${PROJECT_ROOT}/CHANGELOG.md`;

const COLOR_INFO = "\x1b[32m";
const COLOR_WARN = "\x1b[33m";
const COLOR_ERROR = "\x1b[31m";
const COLOR_RESET = "\x1b[0m";
const COLOR_BOLD = "\x1b[1m";

const operations = [];

function log(type, message) {
  const map = { info: COLOR_INFO, warn: COLOR_WARN, error: COLOR_ERROR, success: COLOR_INFO };
  const prefix = map[type] || COLOR_INFO;
  const tag = type === "success" ? "OK" : type.toUpperCase();
  const line = `${prefix}[${tag}]${COLOR_RESET} ${message}`;
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
};

let lastOpts = { ...defaults };

function runGit(args, { allowFail = false, dryRun = false, pipeStdout = false } = {}) {
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
  return opts;
}

function printHelp() {
  console.log(`
${COLOR_BOLD}Git Flow Release/Hotfix Finalizer${COLOR_RESET}

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
`);
}

function validateVersion(version) {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version);
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

function ensureCleanTree() {
  const status = runGit("status --porcelain", { allowFail: true });
  if (status && status.length > 0) {
    logError("Uncommitted changes detected. Please commit or stash first.");
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
  candidates.forEach((b, idx) => console.log(`  ${idx + 1}. ${b}`));
  const answer = promptTextSync("Enter choice: ");
  const index = Number(answer) - 1;
  if (Number.isNaN(index) || index < 0 || index >= candidates.length) {
    logError("Invalid selection");
    process.exit(1);
  }
  return candidates[index];
}

function promptTextSync(question) {
  process.stdout.write(question);
  const buffer = Buffer.alloc(1024);
  const bytes = readSync(0, buffer, 0, buffer.length, null);
  return buffer.slice(0, bytes).toString().trim();
}

function ensureTagMissing(version) {
  const tagName = `v${version}`;
  const tags = runGit("tag -l", { allowFail: true }) || "";
  if (tags.split("\n").includes(tagName)) {
    logError(`Tag ${tagName} already exists.`);
    process.exit(1);
  }
}

function pullBranch(name, opts) {
  if (opts.offline) return;
  runGit(`checkout ${name}`, { dryRun: opts.dryRun });
  runGit(`pull --ff-only origin ${name}`, { dryRun: opts.dryRun, allowFail: true });
}

function checkout(name, opts) {
  runGit(`checkout ${name}`, { dryRun: opts.dryRun });
}

function merge(source, target, opts) {
  checkout(target, opts);
  const res = runGit(`merge ${source} --no-ff --no-edit`, { allowFail: true, dryRun: opts.dryRun, pipeStdout: true });
  if (res === null && !opts.dryRun) {
    logError(`Merge of ${source} into ${target} failed. Resolve conflicts and retry.`);
    process.exit(1);
  }
  logSuccess(`Merged ${source} -> ${target}`);
}

function createTag(version, opts) {
  const tagName = `v${version}`;
  const message = `Release version ${version}`;
  runGit(`tag -a ${tagName} -m "${message}"`, { dryRun: opts.dryRun });
  logSuccess(`Created tag ${tagName}`);
}

function deleteBranch(branch, opts) {
  if (opts.keepBranch) {
    logWarn("Skipping branch deletion (--keep-branch)");
    return;
  }
  runGit(`branch -D ${branch}`, { dryRun: opts.dryRun, allowFail: true });
  runGit(`push origin --delete ${branch}`, { dryRun: opts.dryRun, allowFail: true });
  logSuccess(`Deleted branch ${branch}`);
}

function pushAll(opts) {
  if (!opts.push) {
    logWarn("Skipping push (use --push to publish)");
    return;
  }
  runGit("push origin main", { dryRun: opts.dryRun, allowFail: true, pipeStdout: true });
  runGit("push origin develop", { dryRun: opts.dryRun, allowFail: true, pipeStdout: true });
  runGit("push origin --tags", { dryRun: opts.dryRun, allowFail: true, pipeStdout: true });
  logSuccess("Pushed main, develop, and tags");
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

function ensureChangelog(version, opts) {
  if (opts.noChangelog) return false;
  const existing = existsSync(CHANGELOG_FILE) ? readFileSync(CHANGELOG_FILE, "utf-8") : "";
  if (existing.includes(`## v${version}`)) {
    logInfo("Changelog already has this version.");
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
  const content = `${sectionLines.join("\n")}${existing}`;
  if (opts.dryRun) {
    logInfo(`[dry-run] would update CHANGELOG.md with v${version}`);
    return false;
  }
  writeFileSync(CHANGELOG_FILE, content, "utf-8");
  runGit(`add ${CHANGELOG_FILE}`, { dryRun: opts.dryRun });
  runGit(`commit -m "docs: update changelog for v${version}"`, { dryRun: opts.dryRun });
  logSuccess("Changelog updated");
  return true;
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

function requireBranchVersion(branch, fileVersion) {
  const match = branch.match(/v(\d+\.\d+\.\d+)$/);
  if (!match) return;
  const branchVersion = match[1];
  if (branchVersion !== fileVersion) {
    logWarn(`Branch version (${branchVersion}) differs from version.txt (${fileVersion}). Using version.txt.`);
  }
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
  console.log(`${COLOR_BOLD}Git Flow Release/Hotfix Finalizer${COLOR_RESET}\n`);
  const opts = parseArgs();
  lastOpts = opts;

  ensureCleanTree();
  ensureBranchExists("main");
  ensureBranchExists("develop");

  const version = readVersion();
  ensureTagMissing(version);

  const targetBranch = detectBranch(opts);
  const effectiveType = ensureBranchMatchesType(targetBranch, opts.type);
  requireBranchVersion(targetBranch, version);

  if (!opts.offline) {
    pullBranch("main", opts);
    pullBranch("develop", opts);
    pullBranch(targetBranch, opts);
  }

  // Ensure changelog present before merges so it propagates
  checkout(targetBranch, opts);
  ensureChangelog(version, opts);

  // Merge to main, tag
  merge(targetBranch, "main", opts);
  createTag(version, opts);

  // Merge to develop
  merge(targetBranch, "develop", opts);

  // Delete branch
  deleteBranch(targetBranch, opts);

  // Push
  pushAll(opts);

  logSuccess("Release/hotfix finalized.");
  console.log(`\n${COLOR_BOLD}Version:${COLOR_RESET} ${version}`);
  console.log(`${COLOR_BOLD}Branch:${COLOR_RESET} ${targetBranch}`);

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
