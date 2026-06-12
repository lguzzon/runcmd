# runcmd

A universal script runner that simplifies JavaScript/TypeScript execution using the Bun runtime. The runners handle all the boilerplate—Bun installation, environment setup, and integrated tooling—so you can focus on your script logic.

## 🚀 What is runcmd?

runcmd separates boilerplate from business logic:

- **Runner scripts** (`runcmd.sh`, `runcmd.bat`) handle Bun installation, path resolution, environment loading, and integrated tooling
- **Target scripts** (`.mjs` files) contain your actual application logic

The result is a professional-grade script runner with zero configuration and cross-platform support.

## ✨ Key Features

### Core Functionality

- **Automatic Bun Installation** - Detects and installs Bun to your home directory if missing
- **Cross-Platform Support** - Works on Unix/macOS (`runcmd.sh`) and Windows (`runcmd.bat`)
- **Smart Script Resolution** - Automatically discovers `.mjs` files based on runner name
- **Environment Management** - Automatic `.env` file loading from script and current directories
- **Exit Code Propagation** - Script exit codes are correctly passed back to the caller

### Development Tooling

- **Integrated Code Formatting** - oxlint for linting, oxfmt for formatting JavaScript/TypeScript, shfmt for shell scripts
- **JSON Validation** - Automatic JSON file sorting and validation
- **Debug Mode** - Millisecond-precision timing and detailed execution logs
- **Self-Healing** - Safe self-formatting for currently running scripts
- **Atomic Operations** - Safe file operations with rollback protection

### Advanced Features

- **Git Flow Integration** - Comprehensive git-flow management tools in [`scripts/`](scripts/)
- **Version Management** - Automatic self-updates from GitHub Pages
- **Comprehensive Help** - Built-in help system with examples
- **Zero Configuration** - Auto-installs Bun and tooling; only requires bash, curl

## 📦 Quick Start

### Installation

Download and make executable:

```bash
curl -fsSL https://lguzzon.github.io/runcmd/runcmd.sh -o runcmd.sh
chmod +x runcmd.sh
```

### Basic Usage

```bash
# Run default script (runcmd.mjs)
./runcmd.sh

# With debug output
./runcmd.sh +debug

# Run a specific script with arguments
./runcmd.sh +r ./my-script.mjs --option value

# Format and validate code
./runcmd.sh +check
```

### Windows Support

```cmd
runcmd.bat
runcmd.bat +d
runcmd.bat +r script.mjs
runcmd.bat +check
```

## 🛠️ Usage Guide

### Script Resolution

The runner automatically looks for `<runner_name>.mjs` in this order:

1. **Explicit path**: `+r <path>` flag (both platforms)
2. **Current directory**: `<runner>.mjs` in working directory
3. **Script directory**: `<runner>.mjs` in runner's directory

**Example:**

```bash
# Creates build.sh runner
cp runcmd.sh build.sh

# Creates corresponding script
echo 'console.log("Building...");' > build.mjs

# Run it - automatically finds build.mjs
./build.sh
```

### Debug Mode

**Unix/macOS:**

```bash
./runcmd.sh +debug              # Enable debug logging
DEBUG=1 ./runcmd.sh             # Alternative via environment variable
./runcmd.sh +dd                 # With file operation details
./runcmd.sh +ddd                # Full echo of all operations
./runcmd.sh +d0                 # Disable debug output
```

**Windows:**

```cmd
runcmd.bat +d       :: Basic debug output
runcmd.bat +dd      :: With file operations
runcmd.bat +ddd     :: Full echo mode
runcmd.bat +d0      :: Disable debug
```

### Code Quality Checks

Comprehensive check mode formats and validates your code:

```bash
# Format shell scripts, sort JSON, run oxlint/oxfmt checks
./runcmd.sh +check

# Manual tool execution
bunx oxlint --fix-dangerously . && bunx oxfmt --write .
bunx shfmt -w -bn -ci -i 2 -s *.sh
bunx json-sort-cli "**/*.json"
```

### Environment Variables

`.env` files are automatically loaded in this order:

1. Script directory `.env`
2. Current directory `.env` (can override script directory values)

```bash
# .env format:
VAR1=value1
VAR2=value2
# Comments start with #
```

## 🎯 Git Flow Integration

The [`scripts/`](scripts/) directory contains comprehensive git-flow management tools:

### Core Commands

```bash
# Initialize git-flow
bun scripts/git-flow.js init

# Branch management
bun scripts/git-flow.js start feature new-auth
bun scripts/git-flow.js finish feature new-auth

# Release management
bun scripts/git-flow.js release start --bump minor
bun scripts/git-flow.js hotfix finish --tag v1.1.1 --message "Hotfix"
```

### Available Commands

- **Branch Operations**: `start`, `finish`, `publish`, `track`, `delete`, `list`
- **High-Level Operations**: `release`, `hotfix`, `sync`, `clone`
- **Configuration**: `config` (get/set/list git-flow settings)
- **Utilities**: `init`, `install` (ensure git-flow availability)

### Commands Reference

| Command                 | Description                       | Example                              |
| ----------------------- | --------------------------------- | ------------------------------------ |
| `init`                  | Initialize git-flow in repository | `git-flow.js init`                   |
| `start <type> <name>`   | Start new branch                  | `start feature new-auth`             |
| `finish <type> <name>`  | Finish and merge branch           | `finish feature new-auth`            |
| `publish <type> <name>` | Publish branch to remote          | `publish feature new-auth`           |
| `track <type> <name>`   | Track remote branch locally       | `track feature new-auth`             |
| `delete <type> <name>`  | Delete branch                     | `delete feature old-feature`         |
| `list [type]`           | List branches by type             | `list feature`                       |
| `release <action>`      | Manage release branches           | `release start --bump minor`         |
| `hotfix <action>`       | Manage hotfix branches            | `hotfix finish --tag v1.1.1`         |
| `sync`                  | Sync main/master & develop        | `sync --dry-run`                     |
| `clone <url> [dir]`     | Clone and initialize git-flow     | `clone https://github.com/user/repo` |

## 🏗️ Project Structure

```text
runcmd/
├── runcmd.sh           # Unix/macOS runner (1140 lines)
├── runcmd.bat          # Windows runner (610 lines)
├── runcmd.mjs          # Default target script
├── version.txt         # Current version
├── CHANGELOG.md        # Version history
├── LICENSE             # MIT License
├── scripts/            # Git-flow management tools
│   ├── git-flow.js     # Main git-flow command handler
│   ├── commands/       # Individual command implementations
│   │   ├── init.js     # Initialize git-flow
│   │   ├── start.js    # Start branches
│   │   ├── finish.js   # Finish branches
│   │   ├── publish.js  # Publish branches
│   │   ├── track.js    # Track branches
│   │   ├── delete.js   # Delete branches
│   │   ├── list.js     # List branches
│   │   └── config.js   # Configuration management
│   ├── lib/            # Shared utilities
│   │   ├── version.js  # Version utilities
│   │   ├── changelog.js # Changelog utilities
│   │   ├── prompts.js  # User interaction utilities
│   │   └── core.js     # Core validation helpers
│   └── operations/     # High-level operations
│       ├── sync.js     # Sync branches
│       ├── clone.js    # Clone with git-flow
│       ├── options.js  # Release option defaults
│       ├── release-utils.js # Release lifecycle helpers
│       ├── release.js  # Release management
│       └── hotfix.js   # Hotfix management
├── website/            # Astro-based documentation site
│   ├── src/            # Website source
│   ├── public/         # Static assets
│   └── package.json    # Website dependencies
└── .github/            # GitHub workflows
    └── workflows/      # CI/CD pipelines
```

## ⚙️ Configuration

### Code Quality Tools (oxlint/oxfmt)

The project uses [oxlint](https://oxc.rs/) for linting and [oxfmt](https://oxc.rs/) for formatting JavaScript/TypeScript code. Configuration via `.oxfmtrc.json` and `oxlint.json`:

- **oxlint --fix-dangerously** — Lint and auto-fix JS/TS files
- **oxfmt --write** — Format JS/TS files
- **shellcheck** — Validate shell scripts
- **shfmt** — Format shell scripts
- **json-sort-cli** — Sort JSON files

### Environment Variables

| Variable           | Description          | Default     |
| ------------------ | -------------------- | ----------- |
| `DEBUG`            | Enable debug logging | `0`         |
| `RUNCMD_NO_UPDATE` | Disable auto-updates | `0`         |
| `RUNCMD_HOME`      | State directory      | `~/.runcmd` |

## 🚀 Development

### Website (Astro)

```bash
cd website
bun install
bun run dev    # start dev server
bun run check  # astro type checks
bun run build  # outputs to ../public for GitHub Pages
```

### Testing

```bash
# Test runner functionality
./runcmd.sh +debug

# Test git-flow commands
bun scripts/git-flow.js help

# Test with custom scripts
echo 'console.log("Test");' > test.mjs
./runcmd.sh +r test.mjs
```

### Publishing

GitHub Pages is built from the `website` folder using Bun in `.github/workflows/publish.yml`. Locally, run the commands above; CI uses `bun install --frozen-lockfile` and `bun run build`.

## 📋 Requirements

| Component | Unix/macOS                        | Windows |
| --------- | --------------------------------- | ------- |
| Bash      | 4.0+                              | -       |
| curl      | For Bun installation              | -       |
| Internet  | Initial Bun and tool installation | Same    |

All tools (Bun, oxlint, oxfmt, shfmt, json-sort-cli) are auto-installed via `bunx` when first needed.

## 📚 Documentation

- **Main Documentation**: [`README.md`](README.md)
- **Website**: [https://lguzzon.github.io/runcmd](https://lguzzon.github.io/runcmd)
- **API Reference**: See individual script files for detailed comments
- **Git Flow Guide**: [`scripts/git-flow.js`](scripts/git-flow.js) help system

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Bun](https://bun.sh/) for speed and simplicity
- Uses [oxlint/oxfmt](https://oxc.rs/) for code formatting and linting
- Integrates with [git-flow](https://github.com/nvie/gitflow) for Git workflow management

---

**runcmd** - Universal Script Runner for Modern Development Teams
