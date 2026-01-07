# runcmd

A universal script runner that simplifies JavaScript/TypeScript execution using the Bun runtime. The runners handle all the boilerplate—Bun installation, environment setup, and integrated tooling—so you can focus on your script logic.

## What is runcmd?

runcmd separates boilerplate from business logic:

- **Runner scripts** (`runcmd.sh`, `runcmd.bat`) handle Bun installation, path resolution, environment loading, and integrated tooling
- **Target scripts** (`.mjs` files) contain your actual application logic

The result is a professional-grade script runner with zero configuration and cross-platform support.

## Features

- **Automatic Bun Installation** - Detects and installs Bun to your home directory if missing
- **Cross-Platform Support** - Works on Unix/macOS (`runcmd.sh`) and Windows (`runcmd.bat`)
- **Integrated Tooling** - Built-in support for Biome, shfmt, and json-sort-cli via `bunx`
- **Environment Management** - Automatic `.env` file loading from script and current directories
- **Smart Script Resolution** - Automatically discovers `.mjs` files based on runner name
- **Debug Mode** - Millisecond-precision timing and detailed execution logs
- **Exit Code Propagation** - Script exit codes are correctly passed back to the caller
- **Self-Formatting** - Runners can format their own source code safely

## Quick Start

Install [Bun](https://bun.sh/) (or let the runner install it automatically) and make the runner executable.

### Unix/macOS

```bash
# Download and run
./runcmd.sh

# With debug output
./runcmd.sh +debug

# Run a specific script with arguments
./runcmd.sh +r ./my-script.mjs --option value
```

### Windows

```cmd
runcmd.bat

:: With debug output
runcmd.bat +d

:: Run a specific script
runcmd.bat +e my-script.mjs
```

## Usage

### Basic Execution

The runner automatically looks for `<runner_name>.mjs` in the current directory, then falls back to the same directory as the runner.

```bash
# Copies of the runner inherit the naming convention:
./build.sh    # looks for build.mjs
./deploy.sh   # looks for deploy.mjs
```

### Script Resolution

| Priority | Unix/macOS | Windows |
|----------|------------|---------|
| 1 | `+r <path>` flag | Path as first argument |
| 2 | Current directory `<runner>.mjs` | Current directory with supported extensions |
| 3 | Script directory `<runner>.mjs` | Script directory with supported extensions |

Supported extensions: `.js`, `.mjs`, `.ts`, `.py` (Windows)

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
# Unix/macOS only - format and check everything
./runcmd.sh +check

# Manual tool execution
bunx @biomejs/biome check --unsafe --write .
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

**Windows custom environment:**
```cmd
runcmd.bat --env custom.env
```

## Creating Custom Runners

The design makes it easy to create specialized runners:

1. Copy `runcmd.sh` to your desired name:
   ```bash
   cp runcmd.sh build.sh
   ```

2. Create the corresponding script file:
   ```bash
   # build.mjs - your build logic
   console.log('Running build...');
   ```

3. Run it:
   ```bash
   ./build.sh
   ```

The runner automatically discovers `build.mjs` based on the runner name.

## Requirements

| Component | Unix/macOS | Windows |
|-----------|------------|---------|
| Bash | 4.0+ | - |
| Python 3 | For path resolution and timing | - |
| curl | For Bun installation | - |
| Internet | Initial Bun and tool installation | Same |

All tools (Bun, Biome, shfmt, json-sort-cli) are auto-installed via `bunx` when first needed.

## Development

### Website (Astro)

```bash
cd website
bun install
bun run dev    # start dev server
bun run lint   # eslint
bun run check  # astro type checks
bun run build  # outputs to ../public for GitHub Pages
```

### Publishing

GitHub Pages is built from the `website` folder using Bun in `.github/workflows/publish.yml`. Locally, run the commands above; CI uses `bun install --frozen-lockfile` and `bun run build`.

## Project Structure

```
runcmd/
├── runcmd.sh       # Unix/macOS runner (968 lines)
├── runcmd.bat      # Windows runner (364 lines)
├── runcmd.mjs      # Default target script
├── biome.json      # Biome configuration
└── LICENSE         # MIT License
```

## Configuration

### Biome Settings (`biome.json`)

The project uses Biome for formatting and linting with these defaults:

- **Formatter**: 2-space indent, single quotes, 80 char line width
- **Linter**: Recommended rules enabled
- **Import organization**: Auto-enabled on save

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

Built with Bun for speed and simplicity.