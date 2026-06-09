import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  ensureBranchExists,
  ensureBranchMissing,
  ensureCleanTree,
  ensureTagMissing,
  logError,
  logInfo,
  logSuccess,
  logWarn,
  pullBranch,
  runGit,
  runGitFlow,
} from "../git-flow.js";
import { appendChangelog } from "./changelog.js";
import { promptText } from "./prompts.js";
import { compareVersions, incrementVersion, readVersion, validateVersion } from "./version.js";

const PROJECT_ROOT = process.cwd();
const VERSION_FILE = `${PROJECT_ROOT}/version.txt`;
const CHANGELOG_FILE = `${PROJECT_ROOT}/CHANGELOG.md`;

export function updateVersionFile(version, { dryRun }) {
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

export function commitChanges(version, type, { dryRun }) {
  const message = `chore: bump version to ${version} for ${type}`;
  runGit(`add ${VERSION_FILE}${existsSync(CHANGELOG_FILE) ? ` ${CHANGELOG_FILE}` : ""}`, {
    dryRun,
  });
  runGit(`commit -m "${message}"`, { dryRun });
}

export async function promptVersion(currentVersion, opts) {
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

export async function handleStart(config, opts) {
  const { defaultBump, defaultBase, prefix, typeLabel } = config;
  ensureCleanTree();
  ensureBranchExists(defaultBase);

  const currentVersion = readVersion();
  let { name, bump, version, base, push, noChangelog, dryRun, offline, yes } = opts;

  // The default "nextRelease" from parseArgs should not be used for versioned releases
  if (name === "nextRelease") name = undefined;

  const newVersion = await promptVersion(currentVersion, {
    version,
    bump: bump || defaultBump,
    yes,
  });

  if (!validateVersion(newVersion)) {
    logError("Invalid version format");
    process.exit(1);
  }

  if (compareVersions(newVersion, currentVersion) < 0) {
    logError(`New version ${newVersion} cannot be lower than current ${currentVersion}`);
    process.exit(1);
  }

  const branchName = `${prefix}${name ? (name.startsWith("v") ? name : `v${name}`) : `v${newVersion}`}`;
  ensureBranchMissing(branchName);

  const baseBranch = base || defaultBase;
  if (!offline) {
    pullBranch(baseBranch, { dryRun, offline });
  }

  logInfo(`Starting ${typeLabel} branch: ${branchName}`);
  const releaseName = name ? (name.startsWith("v") ? name : `v${name}`) : `v${newVersion}`;
  runGitFlow(`${typeLabel} start ${releaseName} ${baseBranch}`, { dryRun });
  logSuccess(
    `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} branch started: ${branchName}`,
  );

  const versionChanged = updateVersionFile(newVersion, { dryRun });
  let changelogChanged = false;
  if (!noChangelog) {
    changelogChanged = appendChangelog(newVersion, { dryRun });
  }

  commitChanges(newVersion, typeLabel, { dryRun });

  if (push) {
    runGit(`push -u origin ${branchName}`, { dryRun });
    logSuccess(`Pushed ${branchName}`);
  }

  logSuccess(
    `${
      typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)
    } initialized: ${branchName} (version ${newVersion})`,
  );
  if (dryRun) {
    logWarn("Dry-run completed. No changes were applied.");
  } else {
    if (!versionChanged && !changelogChanged) {
      logWarn("No files were changed (version/changelog). Check your inputs.");
    }
  }
}

export async function handleFinish(config, opts) {
  const { prefix, typeLabel } = config;

  ensureCleanTree();
  ensureBranchExists("main");
  ensureBranchExists("develop");

  let { name, tag, message, push, keepBranch, dryRun, offline } = opts;

  // The default "nextRelease" from parseArgs should not be used for versioned releases
  if (name === "nextRelease") name = undefined;

  if (!tag || !message) {
    logError(`--tag and --message are required for ${typeLabel} finish`);
    process.exit(1);
  }

  ensureTagMissing(tag.replace(/^v/, ""));

  const branchName = `${prefix}${name ? (name.startsWith("v") ? name : `v${name}`) : tag}`;
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

  const cmdName = name ? (name.startsWith("v") ? name : `v${name}`) : tag;
  const cmd = `${typeLabel} finish ${flags.join(" ")} ${cmdName}`;
  logInfo(`Finishing ${typeLabel} branch: ${branchName}`);
  runGitFlow(cmd, { dryRun });
  logSuccess(
    `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} branch finalized: ${branchName}`,
  );

  if (push && offline) {
    logWarn("--push ignored in offline mode");
  }

  if (!keepBranch && !dryRun) {
    runGit(`branch -D ${branchName}`, { allowFail: true });
  }

  logSuccess(`${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} completed: ${tag}`);
}
