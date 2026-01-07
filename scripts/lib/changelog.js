#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { logInfo, runGit } from "../git-flow.js";

const PROJECT_ROOT = process.cwd();
const CHANGELOG_FILE = `${PROJECT_ROOT}/CHANGELOG.md`;

export function getLastTag() {
	const tag = runGit("describe --tags --abbrev=0", { allowFail: true });
	return tag || null;
}

export function collectCommitsSince(ref) {
	const range = ref ? `${ref}..HEAD` : "HEAD";
	const commits = runGit(`log ${range} --pretty=format:"- %s"`, {
		allowFail: true,
	});
	if (!commits) return [];
	return commits.split("\n").filter(Boolean);
}

export function appendChangelog(version, opts) {
	const existing = existsSync(CHANGELOG_FILE)
		? readFileSync(CHANGELOG_FILE, "utf-8")
		: "";
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
	if (opts.dryRun) {
		logInfo(`[dry-run] would update CHANGELOG.md with v${version}`);
		return false;
	}
	writeFileSync(CHANGELOG_FILE, nextContent, "utf-8");
	return true;
}

export function commitChangelog(version, opts) {
	runGit(`add CHANGELOG.md`, { dryRun: opts.dryRun });
	runGit(`commit -m "docs: update changelog for v${version}"`, {
		dryRun: opts.dryRun,
	});
}