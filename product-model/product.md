---
id: runcmd
summary: Zero-config Bun-based script runner with integrated tooling, git-flow automation, and a documentation site.
category: developer-tools
tags: [script-runner, bun, cli, git-flow]
authors:
  - name: Luca Guzzon
    url: https://github.com/lguzzon
license: MIT
languages: [en]
limitations:
  - The JavaScript and TypeScript runtime is Bun only; the Windows runner additionally runs Python scripts through mise.
  - Self-updates download only from lguzzon.github.io/runcmd; there is no other update source.
  - Script dependencies are not managed; there is no package.json or install step for target scripts.
references:
  - kind: doc
    role: intent
    target: README.md
---

# runcmd

Universal script runner for JavaScript and TypeScript files: platform runners (`runcmd.sh` on Unix and macOS, `runcmd.bat` on Windows) handle Bun installation, path resolution, `.env` loading, weekly self-updates, and integrated formatting and linting, so the target script stays focused on its own logic. The product also ships the Git Flow helper — a guarded CLI for branch lifecycle, release and hotfix orchestration, cloning, and synchronization — and a public documentation website.
