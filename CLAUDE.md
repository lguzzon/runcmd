# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`runcmd` is a universal script runner that simplifies execution of JavaScript/TypeScript files using the Bun runtime. The key innovation is that platform-specific shell scripts (`runcmd.sh` for Unix/macOS, `runcmd.bat` for Windows) manage the Bun installation, environment setup, and integrated tooling (formatting/linting), while a target `.mjs` file contains the actual script logic.

## Architecture

The project has three core runner files:

1. **runcmd.sh** (968 lines): Unix/macOS bash script with comprehensive features
2. **runcmd.bat** (364 lines): Windows batch equivalent
3. **runcmd.mjs**: Target script that the runner executes (this is the user's actual script)

The runners are designed to be copied and the `.mjs` file modified to contain your script logic. The runner scripts handle all boiler plate.

### Script Resolution

The runners automatically discover the target script:

1. First look for `<runner_name>.mjs` in the current working directory
2. Fall back to `<runner_name>.mjs` in the same directory as the runner script
3. Override with `+r <path>` flag (sh) or pass path as argument (bat)

Example: If you copy `runcmd.sh` to `myscript.sh`, it will look for `myscript.mjs`.

## Common Commands

### Running Scripts

```bash
# Unix/macOS
./runcmd.sh                          # Run default runcmd.mjs
./runcmd.sh +debug                   # Run with debug logging and timing
./runcmd.sh +r ./src/app.mjs dev     # Run specific script with arguments
DEBUG=1 ./runcmd.sh                  # Alternative: Enable debug via env var

# Windows
runcmd.bat                           # Run default runcmd.mjs
runcmd.bat +d                        # Run with debug logging
runcmd.bat +e                        # List all environment variables
runcmd.bat --env custom.env          # Load custom .env file
```

### Code Quality Checks

```bash
# Unix/macOS only - Comprehensive check mode
./runcmd.sh +check                   # Format .sh scripts, JSON files, run Biome check

# Manually run tools
bunx @biomejs/biome check --unsafe --write .
bunx @biomejs/biome migrate --write .
bunx shfmt -w -bn -ci -i 2 -s *.sh
bunx json-sort-cli "**/*.json"
```

### Environment Variables

The `.env` files are automatically loaded (script directory `.env` loaded first, then current directory `.env` can override):

```bash
# .env files are parsed for KEY=VALUE pairs
# Format:
VAR1=value1
VAR2=value2
# Comments start with #
```

## Script Features

### runcmd.sh (Unix/macOS)

Key capabilities:

- **Automatic Bun Installation**: Detects and installs Bun to `$HOME/.bun` if missing
- **Safe Self-Formatting**: Can format its own source file using atomic operations with rollback protection
- **Cross-Platform Path Resolution**: Uses `greadlink` (macOS), `readlink` (Linux), or Python fallback
- **Multiple Search Paths**: Checks current directory, script directory, and explicit paths
- **Timing Functionality**: Debug mode includes millisecond-precision execution timing with Python
- **Tool Dependencies**: Auto-installs through `bunx`: `@biomejs/biome`, `shfmt`, `json-sort-cli`
- **Exit Code Propagation**: Returns the exit code from the executed .mjs script

Script resolution priority (`+r <path>` flag):

1. Empty → use default script resolution
2. Directory path → look for `<scriptname>.mjs` in that directory
3. Filename → try direct path, `./<filename>`, `./scriptdir/<filename>`
4. Validates file ends with `.mjs`

### runcmd.bat (Windows)

Key capabilities:

- **Multiple File Types**: Supports `.js`, `.mjs`, `.ts`, and `.py` files
- **Integrated Tool Discovery**: Checks PATH, local installation (`%USERPROFILE%\.bun\bin`), or auto-installs
- **Python Execution**: Uses `mise exec python@latest` for `.py` files
- **Enhanced Debug Modes**: `+d` (basic), `+dd` (with file ops), `+ddd` (full echo), `+d0` (disable)
- **Delayed Variable Expansion**: Enables complex string operations

Script resolution priority:

1. Current working directory with each supported extension
2. Script directory with each supported extension
3. Explicit path passed as first argument

## Code Organization

### Biome Configuration

`biome.json` configures:

- Formatter: 2-space indent, single quotes, 80 char line width, semicolons as-needed
- Linter: Recommended rules enabled
- Import organization: Auto-enabled on save
- VCS integration: Git enabled, ignore file disabled

Modify this file to adjust formatting/linting rules for the project.

### Shell Script Functions

The `runcmd.sh` is organized into functional sections (see line comments for boundaries):

- Path resolution utilities (lines 156-193): `resolve_path`, `resolve_script_path`
- Script discovery (lines 219-303): `resolve_default_script`, `resolve_script_path`
- Tooling integration (lines 305-603): Biome, shfmt, json-sort-cli
- Safe file operations (lines 355-456): `safe_format_file` with atomic updates
- Execution orchestration (lines 731-757): `execute_script`
- Environment loading (lines 853-909): `load_env_file`, `load_env_files`
- Main entry point (lines 946-965): `main` function

## Dependencies

- **Bun**: JavaScript runtime and package manager (auto-installed)
- **Biome**: Fast JavaScript/TypeScript linter and formatter (via bunx)
- **shfmt**: Shell script parser and formatter (via bunx)
- **json-sort-cli**: JSON file sorting utility (via bunx)
- **Python 3**: For path resolution and timing on Unix
- **curl**: For Bun installation (auto-installed if missing)

## Modification Guidelines

### Adding Features to runcmd.sh

- Follow functional section organization and comment boundaries
- Use the existing `log_info` and `log_error` functions for output
- New functions should have comprehensive headers describing purpose, args, returns, and side effects
- Use `command_exists` utility instead of `command -v` directly
- See `safe_format_file` as reference for safe file operations with atomic updates and rollback

### Adding Features to runcmd.bat

- Follow the labeled function sections
- Use `ECHO !var!` for delayed expansion (via `ENABLEDELAYEDEXPANSION`)
- Use `%TO_NUL%` and `%ECHO_TO_NUL%` for debug-aware output suppression
- Add debug mode levels properly in `parse_debug_mode_and_collect`

### Creating New Runners

1. Copy `runcmd.sh` to your desired name (e.g., `build.sh`)
2. Create corresponding `.mjs` file (e.g., `build.mjs`) with your script logic
3. The `.mjs` file will be auto-discovered and executed

## Important Notes

- The `.mjs` file is the target script - this is where your application logic belongs
- The runner scripts are boilerplate and should work as-is, but can be enhanced
- The runners parse arguments to separate runner options from script arguments
- Bun is sourced immediately after installation for immediate availability
- Exit codes from the `.mjs` script are propagated back to the caller
