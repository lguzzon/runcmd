---
scope: The runner scripts, the Git Flow CLI, and the documentation website.
method: Static inspection of entry points, command handlers, operations, and website sources; READMEs and AGENTS.md files read as leads and confirmed in code.
covered:
  - description: The Unix and Windows runner scripts and their update helper.
    paths: [runcmd.sh, runcmd.bat, runcmd.mjs, runcmd-update.js, runcmd-update.manifest.js]
  - description: The Git Flow CLI dispatcher, its commands, and its high-level operations.
    paths: [scripts/cli.js, scripts/git-flow.js, scripts/release-init.js, scripts/release-finalize.js, scripts/commands/, scripts/operations/]
  - description: The shared Git Flow utilities (version, changelog, readme, prompts, options, git, installer, validators, logger, core).
    paths: [scripts/lib/]
  - description: The documentation website sources.
    paths: [website/src/]
exclusions:
  - description: Test suites, read as leads only.
    paths: [tests/]
  - description: Issue tracker state, agent tooling configuration, CI workflows, git hooks, editor settings, and internal planning documents.
    paths: [.beads/, .claude/, .codex/, .cursor/, .github/, .vscode/, .githooks/, docs/, specs/]
  - description: Website build configuration and local CI runner helper, which shape development rather than shipped behavior.
    paths: [website/astro.config.mjs, website/tailwind.config.js, website/package.json, website/tsconfig.json, scripts/run-workflow-locally.sh, scripts/package.json, scripts/bun.lock, scripts/tsconfig.json]
unmapped: []
limitations: []
---

# Coverage
