---
type: web
actors: [developer]
entryPoints:
  - web: https://lguzzon.github.io/runcmd/
  - web: https://lguzzon.github.io/runcmd/docs/
references:
  - kind: code
    role: implementation
    target: website/src/pages/index.astro
  - kind: code
    role: implementation
    target: website/src/pages/docs.astro
---

# Documentation site

The public marketing and documentation website, built statically from version.txt at build time and served from GitHub Pages. It presents the current version, the feature highlights, installation instructions for Unix and Windows, usage, debugging, environment variables, runner capabilities, the Git Flow toolkit, quick commands, and resources, and it offers the runner script for download.
