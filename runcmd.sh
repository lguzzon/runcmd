#!/usr/bin/env bash

# ==============================================================================
# runcmd.sh - Enhanced Bun-based JavaScript/TypeScript Runner with Tooling
# ==============================================================================
#
# DESCRIPTION:
#   This script is a comprehensive wrapper for executing .mjs (JavaScript ES Module)
#   files using the Bun JavaScript runtime. It provides automated installation,
#   environment management, and integrated development tooling including code
#   formatting, linting, and JSON validation.
#
# KEY FEATURES:
#   - Automatic Bun installation and environment setup
#   - Smart script resolution with fallback search paths
#   - Integrated code formatting and linting
#   - Shell script formatting with shfmt (safe self-formatting support)
#   - JSON file sorting and validation
#   - Environment variable loading from .env files
#   - Debug logging with execution timing
#
# ERROR HANDLING CONVENTION:
#   Two-tier model:
#   - Fatal (exit 1): Pre-execution setup failures (path resolution, dependency
#     availability). Process cannot meaningfully continue.
#   - Delegate (return 1): Operational failures (format, lint, sort). Caller
#     decides severity via if ! patterns. See ADR-1 for full rationale.
#   - Cross-platform path resolution
#
# PREREQUISITES:
#   - Bash 4.0+ (for array support and enhanced features)
#   - Bun (for path resolution fallback)
#   - curl (for Bun installation, auto-installed if missing)
#   - Internet connection (for initial Bun and tool installation)
#
# INSTALLATION LOCATIONS:
#   - Bun: $HOME/.bun
#   - Temporary files: System temp directory
#
# ENVIRONMENT VARIABLES:
#   - DEBUG: Set to 1 to enable debug logging
#   - RUNCMD_DEBUG: Set to 1 to enable debug logging (takes precedence over DEBUG)
#   - RUNCMD_NO_UPDATE: Set to 1 to skip the update check
#   - .env files: Automatically loaded from script directory and current directory
#
# DEPENDENCIES (auto-installed):
#   - bun: JavaScript runtime
#   - shfmt: Shell script formatter
#   - json-sort-cli: JSON file sorting utility

set -euo pipefail

# ==============================================================================
# CONVENTION NOTES
# ==============================================================================
# Helper functions return status codes (0 for success/true, 1 for failure/false).
# Callers decide whether to exit or continue based on the return code.
# Functions that exit directly document this with "Exits:" in their header.
# ==============================================================================

UNAME_S=$(uname -s)
readonly UNAME_S

readonly COLOR_INFO="\033[32m"
readonly COLOR_WARN="\033[33m"
readonly COLOR_ERROR="\033[31m"
readonly COLOR_RESET="\033[0m"

# Fallback version - will be updated after script_dir is defined
RUNCMD_VERSION="1.0.0"

# RUNCMD_DEBUG (spec-documented) wins over the legacy DEBUG env var
DEBUG=${RUNCMD_DEBUG:-${DEBUG:-0}}
CHECK_MODE=0
REQUESTED_SCRIPT=""
BUN_ARGS=()
START_TIME=0
TEMP_FILES_ARRAY=()

# Check if debug mode is enabled
# Returns:
#   0 (true) if DEBUG is set to 1, 1 (false) otherwise
is_debug_enabled() {
  [[ ${DEBUG:-0} == "1" ]]
}

log_info() {
  if is_debug_enabled; then
    printf '%b[INFO]%b %s\n' "$COLOR_INFO" "$COLOR_RESET" "$1"
  fi
}

log_warn() {
  printf '%b[WARN]%b %s\n' "$COLOR_WARN" "$COLOR_RESET" "$1" >&2
}

log_error() {
  printf '%b[ERROR]%b %s\n' "$COLOR_ERROR" "$COLOR_RESET" "$1" >&2
}

# Normalize DEBUG environment variable to a consistent value
# Accepts 0/1 and normalizes to 0 or 1
# Args:
#   None (uses global DEBUG variable)
# Globals:
#   DEBUG: Modified to be either 0 or 1
# Returns:
#   None
normalize_debug() {
  local debug_value="${DEBUG:-0}"
  case "$debug_value" in
    1) DEBUG=1 ;;
    0 | "") DEBUG=0 ;;
    *)
      log_warn "Invalid DEBUG value '$DEBUG'. Use 0 or 1. Defaulting to 0."
      DEBUG=0
      ;;
  esac
}

# Check if a command exists in the system PATH
# Args:
#   $1: Command name to check
# Returns:
#   0 if command exists, 1 otherwise
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Print a file's permission bits in octal (e.g. 755), portable across GNU and
# BSD stat. Falls back to 755 when the mode cannot be read.
# Args:
#   $1: File path
# Returns:
#   0 always; prints the mode on stdout
file_mode() {
  if [[ $UNAME_S == Darwin ]]; then
    stat -f '%Lp' "$1" 2>/dev/null || echo 755
  else
    stat -c '%a' "$1" 2>/dev/null || echo 755
  fi
}

# Print usage text. Callers choose the exit status: 0 for +help, 1 for a
# rejected invocation.
usage() {
  cat <<EOF
runcmd v${RUNCMD_VERSION}

Usage: $0 [options] [arguments]

A comprehensive script runner with integrated development tooling that ensures
'Bun' is installed and runs .mjs scripts with automated formatting and validation.

FEATURES:
  - Automatic Bun installation from official source
  - Smart script path resolution with multiple fallback locations
  - Integrated code formatting and shell script formatting (shfmt)
  - JSON file sorting and validation
  - Environment variable loading from .env files
  - Debug logging with execution timing
  - Safe self-formatting for currently running script

OPTIONS:
  +debug, +d
      Enable debug logging with execution timing and detailed operation info

  +nodebug, +nd
      Disable debug logging (overrides DEBUG environment variable)

  +help, +h
      Display this comprehensive help message and exit

  +version, +v
      Print the current runcmd version and exit

  +runme, +r <script_path>
      specify the .mjs script to run instead of auto-discovering default script
      Supports: absolute paths, relative paths, directory names, or script filename
      
  +check, +c
      Run comprehensive check mode including:
        - Format all .sh shell scripts in target and current directories
        - Sort and validate .json files recursively  
        - Run linting and formatting checks on target script
        - Safe formatting of currently executing script
      Exits after completing all checks and formatting

ARGUMENTS:
  Any remaining arguments are passed directly to the target .mjs script
  These can include command-line options, parameters, or data for your script

EXAMPLES:
  runcmd.sh +debug                     # Run default script with debug logging
  runcmd.sh +check                     # Format+validate current directory
  runcmd.sh +r ./src/app.mjs dev       # Run specific script with 'dev' argument
  runcmd.sh +d +c                      # Debug mode during check operations

ENVIRONMENT:
  DEBUG=1  # Enable debug output (same as +debug)
  RUNCMD_DEBUG=1  # Enable debug output (takes precedence over DEBUG)
  RUNCMD_NO_UPDATE=1  # Skip the update check and self-update
  # .env files are auto-loaded from script directory and current working directory

EOF
}

# Resolve a file path to its absolute path with cross-platform compatibility
# Uses platform-specific tools in priority order: greadlink (macOS), readlink (Linux),
# then falls back to Python for maximum compatibility across systems
#
# USAGE:
#   absolute_path=$(resolve_path "./script.sh")
#   absolute_path=$(resolve_path "../relative/path")
#
# Args:
#   $1: Path to resolve (can be relative, absolute, or contain symlinks)
#
# Returns:
#   Absolute, canonical path on stdout
#
# Exits:
#   1 if path is empty, doesn't exist, or cannot be resolved by any method
#
# DEPENDENCIES:
#   - readlink coreutils (Linux) or greadlink (macOS via coreutils)
#   - bun as final fallback for path resolution
#
# NOTES:
#   - Handles symlinks, relative paths, and complex directory structures
#   - Each method is tried in sequence, first successful method wins
#   - Bun fallback uses require('path').resolve() for robust path handling
resolve_path() {
  local target="$1"
  if [[ -z $target ]]; then
    log_error "Path is empty."
    exit 1
  fi

  local resolved=""
  case "$UNAME_S" in
    Darwin)
      if command_exists greadlink; then
        resolved=$(greadlink -f "$target" 2>/dev/null || true)
      fi
      ;;
    *)
      if command_exists readlink; then
        resolved=$(readlink -f "$target" 2>/dev/null || true)
      fi
      ;;
  esac

  if [[ -n $resolved ]]; then
    printf '%s\n' "$resolved"
    return
  fi

  if command_exists bun; then
    _RESOLVE_PATH="$target" bun -e "console.log(require('path').resolve(process.env._RESOLVE_PATH || ''))"
    return
  fi

  log_error "Unable to resolve path '$target': install coreutils (readlink) or ensure bun is available."
  exit 1
}

script_path=$(resolve_path "${BASH_SOURCE[0]}")
readonly script_path
script_dir=$(dirname "$script_path")
readonly script_dir
script_file=$(basename "$script_path")
readonly script_file
script_name="${script_file%.*}"
readonly script_name

# Now that script_dir is defined, read version from version.txt for single source of truth
RUNCMD_VERSION=$(cat "$script_dir/version.txt" 2>/dev/null || echo "$RUNCMD_VERSION")
readonly RUNCMD_VERSION

readonly BUN_INSTALL="$HOME/.bun"
readonly BUN_INSTALL_SCRIPT="https://bun.sh/install"
readonly DEFAULT_SCRIPT="${script_name}.mjs"

# Discover a locally installed Bun even when ~/.bun/bin is not on PATH: the
# installer only edits interactive shell profiles, so without this every run
# would attempt a network reinstall — or abort offline with Bun present.
if ! command_exists bun && [[ -x "$BUN_INSTALL/bin/bun" ]]; then
  export PATH="$BUN_INSTALL/bin:$PATH"
  hash -r
fi

current_dir=$(pwd)
readonly current_dir

# Resolve the default script path by checking current and script directories
# Searches for the default .mjs script in current directory first, then script directory
# Args:
#   None
# Returns:
#   Absolute path to the default script on stdout
# Exits:
#   1 if default script is not found
resolve_default_script() {
  local candidate
  local search_dirs=("$current_dir" "$script_dir")

  for candidate in "${search_dirs[@]}"; do
    local path="$candidate/$DEFAULT_SCRIPT"
    if [[ -f $path ]]; then
      resolve_path "$path"
      return
    fi
  done

  log_error "Default script '$DEFAULT_SCRIPT' not found in '$current_dir' or '$script_dir'."
  exit 1
}

# Check for updates from GitHub Pages
# Delegates the whole decision — interval gating, remote version fetch,
# SHA256 manifest verification, and staging the replacement beside the
# runner — to runcmd-update.js, the single update path shared with
# runcmd.bat. This side keeps only the Unix-specific atomic swap.
# Handshake (one line on the JS process's stdout): UPDATE_READY|<temp>|<version>
# Returns:
#   0 always — a failed update degrades to a warning, never a broken runner
check_for_updates() {
  [[ ${RUNCMD_NO_UPDATE:-0} == "1" ]] && return 0
  command_exists bun || return 0

  local handshake
  handshake=$(bun "$script_dir/runcmd-update.js" "$script_path" "$RUNCMD_VERSION" | grep '^UPDATE_READY|' || true)
  [[ -z $handshake ]] && return 0

  local temp_script new_version
  IFS='|' read -r _ temp_script new_version <<<"$handshake"

  # Second line of defense before the swap: runcmd-update.js already verified
  # the manifest checksum; this re-checks syntax and identity so a broken
  # download can never replace a working runner.
  if ! grep -q "runcmd.sh" "$temp_script" || ! bash -n "$temp_script"; then
    log_error "Downloaded update appears invalid."
    rm -f "$temp_script"
    # runcmd-update.js already advanced version.txt to the new version; put it
    # back so the next check retries instead of going silently up to date.
    printf '%s\n' "$RUNCMD_VERSION" >"$script_dir/version.txt"
    return 0
  fi

  local target_mode
  target_mode=$(file_mode "$script_path")
  # Atomic swap: mv renames a fresh inode over the old path, so this bash
  # process keeps executing the old (now unlinked) script instead of reading
  # a truncated file.
  mv "$temp_script" "$script_path"
  chmod "$target_mode" "$script_path"
  log_info "Updated to version $new_version."
}

# Resolve the default script path within a specified directory
# Checks if the default .mjs script exists in the given directory
# Args:
#   $1: Directory path to check for the default script
# Returns:
#   Absolute path to the default script in the directory on stdout
# Exits:
#   1 if default script is not found in the directory
resolve_default_in_dir() {
  local dir="$1"
  local resolved_dir
  resolved_dir=$(resolve_path "$dir")
  local candidate="$resolved_dir/$DEFAULT_SCRIPT"

  if [[ ! -f $candidate ]]; then
    log_error "Directory '$dir' does not contain '$DEFAULT_SCRIPT'."
    exit 1
  fi

  resolve_path "$candidate"
}

# Resolve the script path based on input, handling various scenarios
# Supports empty input (default script), directory input, and direct file paths
# Args:
#   $1: Input script path, directory, or empty for default
# Returns:
#   Absolute path to the resolved script on stdout
# Exits:
#   1 if script path is invalid or does not exist
resolve_script_path() {
  local input="$1"

  if [[ -z $input ]]; then
    resolve_default_script
    return
  fi

  if [[ -d $input ]]; then
    resolve_default_in_dir "$input"
    return
  fi

  if [[ -d "$script_dir/$input" ]]; then
    resolve_default_in_dir "$script_dir/$input"
    return
  fi

  if [[ $input == "$DEFAULT_SCRIPT" ]]; then
    resolve_default_script
    return
  fi

  local candidates=("$input" "$current_dir/$input" "$script_dir/$input")
  local candidate=""
  for candidate in "${candidates[@]}"; do
    if [[ -f $candidate ]]; then
      if [[ $candidate != *.mjs ]]; then
        log_error "Path '$input' is not an .mjs file."
        exit 1
      fi
      resolve_path "$candidate"
      return
    fi
  done

  log_error "Path '$input' is invalid or does not exist."
  exit 1
}

# ============================================================================
# SHARED SHFMT DISPATCH
# ============================================================================

# Run shfmt with the given arguments, falling back to bunx shfmt if not installed
# Safely format a shell script using shfmt with atomic updates and rollback protection
# Creates backups, validates syntax, and only replaces originals on successful formatting.
# Designed to handle the edge case of formatting the currently executing script.
#
# PROCESS:
#   1. Create secure temporary files in same directory (avoid cross-device issues)
#   2. Backup original file atomically
#   3. Format to temporary file using available shfmt (system or bunx)
#   4. Validate syntax of formatted result with bash -n
#   5. Atomic replace if validation passes; a failed check leaves the
#      original untouched
#
# SAFETY FEATURES:
#   - Atomic file operations to prevent corruption
#   - Syntax validation before replacement
#   - Backup restored if the atomic replace itself fails
#   - Proper cleanup of temporary files via trap
#   - Preserves the original file mode
#
# Args:
#   $1: Path to the shell script file to format (must be .sh file)
#
# Globals:
#   TEMP_FILES_ARRAY: Modified to track created temp files for cleanup
#
# Returns:
#   0 - File successfully formatted and validated
#   1 - Formatting failed, validation failed, or file operations failed
#
# DEPENDENCIES:
#   - shfmt (system) or bunx shfmt (fallback)
#   - bash for syntax validation
#
# EXAMPLES:
#   safe_format_file "./script.sh"          # Format regular script
#   safe_format_file "$script_path"         # Format currently executing script
# Run shfmt with consistent options on a target file
# Uses system shfmt first, then falls back to bunx shfmt
# Args:
#   All: Arguments passed through to shfmt (flags + file path)
# Returns:
#   0 if formatting succeeded, 1 on failure or if neither shfmt nor bunx is available
run_shfmt() {
  if command_exists shfmt; then
    shfmt "$@"
  elif command_exists bunx; then
    bunx --silent shfmt "$@"
  else
    return 1
  fi
}

safe_format_file() {
  local file_path="$1"
  local temp_file
  local backup_file
  local format_success=0

  # Preserve the original mode: mktemp creates 0600 and mv carries it over.
  local file_mode
  file_mode=$(file_mode "$file_path")

  # Create temporary files in the same directory to avoid cross-device issues
  temp_file=$(mktemp "${file_path}.tmp.XXXXXX") || return 1
  backup_file=$(mktemp "${file_path}.bak.XXXXXX") || return 1

  # Store temp file paths in a global array for cleanup
  TEMP_FILES_ARRAY+=("$temp_file" "$backup_file")

  # Avoid re-registering the trap on every invocation — clean TEMP_FILES_ARRAY on EXIT
  # shellcheck disable=SC2154
  trap 'for _f in "${TEMP_FILES_ARRAY[@]}"; do rm -f "$_f" 2>/dev/null || true; done' EXIT

  # Create backup of original file
  if ! cp "$file_path" "$backup_file" 2>/dev/null; then
    log_error "Failed to create backup of '$file_path'"
    return 1
  fi

  # Try to format to temporary file
  if run_shfmt -bn -ci -i 2 -s "$file_path" >"$temp_file" 2>/dev/null; then
    format_success=1
  fi

  if ((format_success)); then
    # Verify the formatted file is valid bash script
    if bash -n "$temp_file" 2>/dev/null; then
      # Atomic replace using mv
      if mv "$temp_file" "$file_path" 2>/dev/null; then
        log_info "Successfully formatted and safely updated: $(basename "$file_path")"
        rm -f "$backup_file" 2>/dev/null || true
        chmod "$file_mode" "$file_path"
        return 0
      else
        log_error "Failed to replace original file: $(basename "$file_path")"
        # Restore from backup
        mv "$backup_file" "$file_path" 2>/dev/null || true
        chmod "$file_mode" "$file_path"
        return 1
      fi
    else
      # The original was never modified: formatting went to temp_file only.
      log_error "Formatted file failed syntax check: $(basename "$file_path")"
      return 1
    fi
  else
    log_error "Formatting failed: $(basename "$file_path")"
    rm -f "$backup_file" 2>/dev/null || true
    return 1
  fi
}

# Format all shell scripts in a directory using shfmt
# Handles special case for currently executing script using safe_format_file
# Searches for all .sh files in the specified directory and formats them
# Args:
#   $1: Directory path to search for shell scripts
# Returns:
#   0 on success, 1 on failure
format_shell_scripts() {
  local search_dir="$1"
  local formatted_count=0
  local failed_count=0
  local self_format_attempted=0

  log_info "Scanning for shell scripts in '$search_dir'..."

  # Find all .sh files in the directory
  local shell_files=()
  while IFS= read -r -d '' file; do
    shell_files+=("$file")
  done < <(find "$search_dir" -maxdepth 1 -name "*.sh" -type f -print0 2>/dev/null)

  if [[ ${#shell_files[@]} -eq 0 ]]; then
    log_info "No shell scripts found in '$search_dir'."
    return 0
  fi

  log_info "Found ${#shell_files[@]} shell script(s) to format."

  # Format each shell script
  for shell_file in "${shell_files[@]}"; do
    local rel_path="${shell_file#"$search_dir"/}"

    # Handle the currently executing script specially
    if [[ $shell_file == "$script_path" ]]; then
      log_info "Safely formatting currently executing script: $rel_path"
      ((++self_format_attempted))
      if safe_format_file "$shell_file"; then
        ((++formatted_count))
      else
        ((++failed_count))
      fi
      continue
    fi

    log_info "Formatting shell script: $rel_path"

    local format_success=0
    if run_shfmt -w -bn -ci -i 2 -s "$shell_file" 2>/dev/null; then
      format_success=1
    fi

    if ((format_success)); then
      log_info "Successfully formatted: $rel_path"
      ((++formatted_count))
    else
      log_error "Failed to format: $rel_path"
      ((++failed_count))
    fi
  done

  # Report summary
  log_info "Shell formatting summary:"
  log_info "  - Formatted: $formatted_count scripts"
  log_info "  - Failed: $failed_count scripts"
  if ((self_format_attempted > 0)); then
    log_info "  - Self-format attempts: $self_format_attempted script(s)"
  fi

  if ((failed_count > 0)); then
    log_error "Some shell scripts failed to format."
    return 1
  fi

  return 0
}

# Run oxlint on a target file
# Executes oxlint with fix-dangerously mode
# Args:
#   $1: Path to target file to lint (kept for interface compatibility)
# Returns:
#   0 on success, 1 on failure
run_lint() {
  local target_file="$1"
  log_info "Running oxlint on '$target_file'..."
  if bunx --silent oxlint --fix-dangerously "$target_file" 2>/dev/null; then
    log_info "oxlint passed."
    return 0
  fi
  log_error "oxlint failed."
  return 1
}

# Run oxfmt formatting on a target directory
# Executes oxfmt with write mode on the specified directory
# Args:
#   $1: Target directory path to format
# Returns:
#   0 on success, 1 on failure
run_oxfmt() {
  local target_dir="$1"
  log_info "Running oxfmt --write on '$target_dir'..."
  if bunx --silent oxfmt --write "$target_dir" 2>/dev/null; then
    log_info "oxfmt passed."
    return 0
  fi
  log_error "oxfmt formatting failed."
  return 1
}

# Print the current epoch time in milliseconds.
# EPOCHREALTIME (bash 5) avoids a process spawn; GNU date covers bash 4 on
# Linux; bun remains the portable last resort (macOS bash 3.2).
now_ms() {
  local now=${EPOCHREALTIME:-}
  if [[ -n $now ]]; then
    printf '%s\n' "$((10#${now%.*} * 1000 + 10#${now#*.} / 1000))"
    return 0
  fi
  now=$(date +%s%3N 2>/dev/null || true)
  if [[ $now =~ ^[0-9]+$ ]]; then
    printf '%s\n' "$now"
    return 0
  fi
  bun -e 'console.log(Date.now())'
}

# Start timing execution if debug mode is enabled
# Globals:
#   DEBUG: Flag indicating if debug mode is enabled
#   START_TIME: Global variable to store start time in milliseconds
# Returns:
#   None
start_timer() {
  if is_debug_enabled; then
    START_TIME=$(now_ms)
  fi
}

# End timing execution and log elapsed time if debug mode is enabled
# Calculates and logs the elapsed time since start_timer was called
# Formats output as: Xd Xh Xm Xs Xms (only showing non-zero units, except seconds and millis)
# Globals:
#   DEBUG: Flag indicating if debug mode is enabled
#   START_TIME: Global variable storing start time in milliseconds
# Returns:
#   None
end_timer() {
  if is_debug_enabled; then
    local end_time
    end_time=$(now_ms)
    local elapsed_ms
    elapsed_ms=$((10#$end_time - 10#$START_TIME))

    # Calculate days, hours, minutes, seconds, and milliseconds
    local days=$((elapsed_ms / 86400000))
    local remaining=$((elapsed_ms % 86400000))
    local hours=$((remaining / 3600000))
    remaining=$((remaining % 3600000))
    local minutes=$((remaining / 60000))
    remaining=$((remaining % 60000))
    local seconds=$((remaining / 1000))
    local millis=$((remaining % 1000))

    # Build the output string, showing only non-zero units (except seconds and millis always shown)
    local output=""
    if ((days > 0)); then
      output="${days}d "
    fi
    if ((hours > 0)); then
      output="${output}${hours}h "
    fi
    if ((minutes > 0)); then
      output="${output}${minutes}m "
    fi
    output="${output}${seconds}s ${millis}ms"

    log_info "Elapsed: ${output}"
  fi
}

# Ensure Bun is installed, installing it if necessary
# Checks for Bun and installs it from the official source if missing
# Installs curl via the available package manager (apt-get/yum/brew) when
# needed for the download
# Globals:
#   BUN_INSTALL: Path to Bun installation directory
#   BUN_INSTALL_SCRIPT: URL to Bun installation script
# Returns:
#   None
# Exits:
#   1 if curl or Bun installation fails or no supported package manager is
#   found
ensure_bun_installed() {
  if command_exists bun; then
    log_info "Bun is installed."
    return
  fi

  log_info "Bun is not installed. Installing now..."
  if ! command_exists curl; then
    log_info "Installing 'curl'..."
    if command_exists apt-get; then
      sudo apt-get update >/dev/null 2>&1
      sudo apt-get install -y curl >/dev/null 2>&1
    elif command_exists yum; then
      sudo yum install -y curl >/dev/null 2>&1
    elif command_exists brew; then
      brew install curl >/dev/null 2>&1
    else
      log_error "Failed to install curl: no supported package manager found."
      exit 1
    fi
    log_info "'curl' installed."
  fi

  local installer_tmp
  installer_tmp=$(mktemp)
  if ! curl -fsSL "$BUN_INSTALL_SCRIPT" -o "$installer_tmp" 2>/dev/null; then
    log_error "Failed to download the Bun installer."
    rm -f "$installer_tmp"
    exit 1
  fi
  # The installer is fetched over TLS from bun.sh. This check only rejects a
  # truncated response or an HTML error page; it is not a signature check.
  if [[ ! -s $installer_tmp ]] || ! head -n1 "$installer_tmp" | grep -q '^#!'; then
    log_error "Downloaded Bun installer is not a shell script. Aborting."
    rm -f "$installer_tmp"
    exit 1
  fi
  if bash "$installer_tmp" >/dev/null 2>&1; then
    log_info "Bun has been successfully installed."
    if [[ -f "$BUN_INSTALL/env" ]]; then
      # shellcheck disable=SC1091
      source "$BUN_INSTALL/env"
      export PATH="$BUN_INSTALL/bin:$PATH"
      hash -r
      log_info "'bun' environment sourced."
    else
      log_error "Failed to source 'bun' environment. Please add '$BUN_INSTALL/bin' to your PATH."
      rm -f "$installer_tmp"
      exit 1
    fi
  else
    log_error "Failed to install Bun."
    rm -f "$installer_tmp"
    exit 1
  fi
  rm -f "$installer_tmp"

  if ! command_exists bun; then
    log_error "Bun installation succeeded but command is unavailable. Add '$BUN_INSTALL/bin' to PATH."
    exit 1
  fi
}

# Execute a script with bun, handling empty and non-empty argument arrays
# Ensures Bun is installed before execution, handles timing, and processes exit codes
# Args:
#   $1: Path to the script to execute
# Globals:
#   BUN_ARGS: Array of additional arguments to pass to the script
# Returns:
#   None (exits with bun's exit code)
execute_script() {
  local target="$1"
  ensure_bun_installed

  log_info "Executing '$target' using Bun..."
  local result=0
  start_timer
  bun run "$target" ${BUN_ARGS[@]+"${BUN_ARGS[@]}"}
  result=$?
  end_timer
  if ((result == 0)); then
    log_info "Script execution completed successfully."
  else
    log_info "Failed to execute '$target' [$result]."
  fi
  return $result
}

# Run check mode operations including shell script formatting, JSON sorting, and linting
# Formats shell scripts in target and current directories, sorts JSON files, then runs linting
# Args:
#   $1: Path to target file for linting
# Returns:
#   None
run_check_mode() {
  local target="$1"
  local target_dir
  target_dir=$(dirname "$target")

  ensure_bun_installed

  # Step 1: Format and lint shell scripts
  log_info "Starting shell script formatting in check mode..."
  if ! format_shell_scripts "$target_dir"; then
    log_error "Shell script formatting failed, but continuing..."
  fi

  if [[ $target_dir != "$current_dir" ]]; then
    if ! format_shell_scripts "$current_dir"; then
      log_error "Shell script formatting in current directory failed, but continuing..."
    fi
  fi

  # Step 2: Shellcheck all shell scripts
  log_info "Running shellcheck..."
  if ! command_exists shellcheck; then
    log_warn "shellcheck not found; skipping shellcheck."
  else
    local shellcheck_failed=0
    while IFS= read -r -d '' sh_file; do
      if ! shellcheck -s bash "$sh_file" 2>/dev/null; then
        log_warn "shellcheck warnings in: $sh_file"
        shellcheck_failed=1
      fi
    done < <(find "$target_dir" -maxdepth 1 -name "*.sh" -type f -print0 2>/dev/null)
    if ((shellcheck_failed)); then
      log_warn "shellcheck completed with warnings (not blocking)."
    else
      log_info "shellcheck passed."
    fi
  fi

  # Step 3: Sort JSON files (non-fatal)
  log_info "Running Json Sort check on '$target_dir'..."
  if ! bunx --silent json-sort-cli "$target_dir/**/*.json"; then
    log_error "Json Sort failed."
    log_warn "JSON sort failed, but continuing..."
  else
    log_info "Json Sort completed successfully."
  fi

  # Step 4: Run oxfmt (non-fatal)
  if ! run_oxfmt "$target_dir"; then
    log_error "oxfmt failed, but continuing..."
  fi

  # Step 5: Final lint gate. Steps 1-4 auto-fix and continue; a failure
  # here means defects survived the fixes, so +check exits non-zero.
  if ! run_lint "$target"; then
    log_error "oxlint failed."
    exit 1
  fi

  log_info "Check mode completed successfully."
}

# Parse command line arguments and set appropriate global variables
# Processes command line options and sets global variables accordingly
# Supports debug mode, check mode, script selection, and argument forwarding
# Args:
#   All command line arguments
# Globals:
#   DEBUG: Set to 1 if debug mode is enabled
#   CHECK_MODE: Set to 1 if check mode is enabled
#   REQUESTED_SCRIPT: Set to the script path if specified
#   BUN_ARGS: Array of additional arguments to pass to the script
# Returns:
#   None
parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      +debug | +d)
        DEBUG=1
        ;;
      +nodebug | +nd)
        DEBUG=0
        ;;
      +help | +h)
        usage
        exit 0
        ;;
      +version | +v)
        echo "runcmd v${RUNCMD_VERSION}"
        exit 0
        ;;
      +runme | +r)
        if [[ $# -lt 2 ]]; then
          log_error "Option '$1' requires a value."
          usage
          exit 1
        fi
        shift
        REQUESTED_SCRIPT="$1"
        ;;
      +check | +c)
        CHECK_MODE=1
        ;;
      +*)
        log_error "Unknown option: $1"
        usage
        exit 1
        ;;
      *)
        BUN_ARGS+=("$1")
        ;;
    esac
    shift
  done
}

# Load environment variables from a .env file
# Reads a .env file line by line, skipping comments and empty lines
# Exports valid KEY=VALUE pairs as environment variables
# Args:
#   $1: Path to the .env file
#   $2: Message to log when loading the file
#   $3: Prefix for exported variable log messages
# Returns:
#   0 on success, 1 if file doesn't exist
load_env_file() {
  local env_file="$1"
  local load_message="$2"
  local export_prefix="$3"

  if [[ ! -f $env_file ]]; then
    return 1
  fi

  log_info "$load_message"
  while IFS= read -r line; do
    [[ $line =~ ^[[:space:]]*# ]] && continue
    [[ -z ${line// /} ]] && continue

    if [[ $line =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
      local key="${line%%=*}"
      local rest="${line#*=}"
      rest="${rest%$'\r'}"
      # Reject control characters: they cannot round-trip through the
      # environment and usually indicate a corrupt or binary file.
      if [[ $rest != *[[:cntrl:]]* ]]; then
        export "$key=$rest"
        log_info "${export_prefix}${key}"
      else
        log_warn "Skipping ${key}=... (value contains control characters)"
      fi
    fi
  done <"$env_file"

  return 0
}

# Load environment variables from .env files in script and current directories
# Loads script directory .env first, then current directory .env (can overwrite)
# Variables from current directory .env will override those from script directory
# Globals:
#   script_dir: Directory where the script is located
#   current_dir: Current working directory
# Returns:
#   None
load_env_files() {
  local script_env_file="$script_dir/.env"
  local current_env_file="$current_dir/.env"
  local loaded_any=0

  if load_env_file "$script_env_file" "Loading environment variables from script directory: $script_env_file" "Exported: "; then
    loaded_any=1
  fi

  # Runner executed from its own directory: both paths are the same file, so a
  # second pass would duplicate exports and skip warnings.
  if [[ $script_env_file -ef $current_env_file ]]; then
    return 0
  fi

  if load_env_file "$current_env_file" "Loading environment variables from current directory: $current_env_file" "Exported (overwrites): "; then
    loaded_any=1
  fi

  if ((! loaded_any)); then
    log_info "No .env files found in script directory or current directory"
  fi
}

# Main execution orchestrator - coordinates all script operations
#
# EXECUTION FLOW:
#   1. Load environment variables from .env files (script dir first, then current dir)
#   2. Parse command line arguments and set global flags
#   3. Resolve target script path using intelligent search algorithm
#   4. Execute appropriate mode based on CHECK_MODE flag:
#      - Check mode: formatting, validation, and linting checks
#      - Normal mode: script execution with Bun
#
# GLOBAL VARIABLES AFFECTED:
#   DEBUG, CHECK_MODE, REQUESTED_SCRIPT, BUN_ARGS
#   Uses temporary files array and timing globals
#
# EXIT CODES:
#   0 - Successful completion (check mode or script execution)
#   1-255 - Various error conditions from dependencies or script failures
#
# PERFORMANCE NOTES:
#   - Uses set -euo pipefail for strict error handling
#   - Temporarily disables errexit to capture bun exit codes
#   - Implements proper cleanup via traps for temporary files
#   - Avoids unnecessary subprocess calls in common case
#
# Args:
#   All: Command line arguments (including options and script arguments)
#
# Returns:
#   None: Function exits the script with appropriate exit code
#
# SIDE EFFECTS:
#   - Modifies environment variables from .env files
#   - May modify files in check mode (formatting, JSON sorting)
#   - Creates and cleans up temporary files
#   - May install dependencies (Bun, curl) if missing
main() {
  # Load environment variables from .env files before processing arguments
  load_env_files

  # Parse first: +help, +version, and rejected options exit inside
  # parse_args, so they never trigger the network update check below.
  parse_args "$@"

  # Normalize DEBUG value to ensure consistent behavior
  normalize_debug

  # Update check only runs for invocations that reach execution
  check_for_updates

  local resolved_script
  resolved_script=$(resolve_script_path "$REQUESTED_SCRIPT")

  if ((CHECK_MODE)); then
    run_check_mode "$resolved_script"
    exit 0
  fi

  # Temporarily disable errexit to capture exit code
  set +e
  execute_script "$resolved_script"
  local result=$?
  set -e
  return $result
}

main "$@"
