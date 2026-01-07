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
#   - Integrated Biome code formatting and linting
#   - Shell script formatting with shfmt (safe self-formatting support)
#   - JSON file sorting and validation
#   - Environment variable loading from .env files
#   - Debug logging with execution timing
#   - Cross-platform path resolution
#
# PREREQUISITES:
#   - Bash 4.0+ (for array support and enhanced features)
#   - Python 3.x (for path resolution and timing functions)
#   - curl (for Bun installation, auto-installed if missing)
#   - Internet connection (for initial Bun and tool installation)
#
# INSTALLATION LOCATIONS:
#   - Bun: $HOME/.bun
#   - Temporary files: System temp directory
#
# ENVIRONMENT VARIABLES:
#   - DEBUG: Set to 1 to enable debug logging
#   - .env files: Automatically loaded from script directory and current directory
#
# DEPENDENCIES (auto-installed):
#   - bun: JavaScript runtime
#   - @biomejs/biome: Code formatter and linter
#   - shfmt: Shell script formatter
#   - json-sort-cli: JSON file sorting utility

set -euo pipefail

UNAME_S=$(uname -s)
readonly UNAME_S

readonly COLOR_INFO="\033[32m"
readonly COLOR_ERROR="\033[31m"
readonly COLOR_RESET="\033[0m"

DEBUG=0
CHECK_MODE=0
REQUESTED_SCRIPT=""
BUN_ARGS=()
START_TIME=0
TEMP_FILES_ARRAY=()

log_info() {
  if [[ -n $DEBUG ]] && [[ $DEBUG != "0" ]] && [[ $DEBUG != "false" ]]; then
    printf '%b[INFO]%b %s\n' "$COLOR_INFO" "$COLOR_RESET" "$1"
  fi
}

log_error() {
  printf '%b[ERROR]%b %s\n' "$COLOR_ERROR" "$COLOR_RESET" "$1" >&2
}

# Check if a command exists in the system PATH
# Args:
#   $1: Command name to check
# Returns:
#   0 if command exists, 1 otherwise
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

usage() {
  cat <<EOF
Usage: $0 [options] [arguments]

A comprehensive script runner with integrated development tooling that ensures
'Bun' is installed and runs .mjs scripts with automated formatting and validation.

FEATURES:
  - Automatic Bun installation from official source
  - Smart script path resolution with multiple fallback locations
  - Integrated code formatting (Biome) and shell script formatting (shfmt)
  - JSON file sorting and validation
  - Environment variable loading from .env files
  - Debug logging with execution timing
  - Safe self-formatting for currently running script

OPTIONS:
  +debug, +d
      Enable debug logging with execution timing and detailed operation info
      
  +help, +h
      Display this comprehensive help message and exit
      
  +runme, +r <script_path>
      specify the .mjs script to run instead of auto-discovering default script
      Supports: absolute paths, relative paths, directory names, or script filename
      
  +check, +c
      Run comprehensive check mode including:
        - Format all .sh shell scripts in target and current directories
        - Sort and validate .json files recursively  
        - Run Biome migration and check on target script
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
  # .env files are auto-loaded from script directory and current working directory

EOF
  exit 1
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
#   - python3 as final fallback for path resolution
#
# NOTES:
#   - Handles symlinks, relative paths, and complex directory structures
#   - Each method is tried in sequence, first successful method wins
#   - Python fallback uses os.path.realpath() for robust path handling
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

  if command_exists python3; then
    python3 - "$target" <<'PY'
import os
import sys
print(os.path.realpath(sys.argv[1]))
PY
    return
  fi

  log_error "Unable to resolve path '$target': install coreutils (readlink) or ensure python3 is available."
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

readonly BUN_INSTALL="$HOME/.bun"
readonly BUN_INSTALL_SCRIPT="https://bun.sh/install"
readonly DEFAULT_SCRIPT="${script_name}.mjs"
# Update Configuration
readonly UPDATE_URL_BASE="https://lguzzon.github.io/runcmd"
readonly RUNCMD_HOME="$HOME/.runcmd"
readonly RUNCMD_STATE="$RUNCMD_HOME/state.json"
readonly UPDATE_CHECK_INTERVAL=$((7 * 24 * 3600)) # 7 days in seconds

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

# Compare two semantic versions (x.y.z)
# Args:
#   $1: Version A (local)
#   $2: Version B (remote)
# Returns:
#   0 if A >= B
#   1 if A < B (update needed)
version_lt() {
  # Trivial case: equal versions
  [[ "$1" == "$2" ]] && return 0
  
  # Parse versions into arrays
  local ver1=(${1//./ })
  local ver2=(${2//./ })
  
  # Fill missing parts with 0
  for ((i=${#ver1[@]}; i<3; i++)); do ver1[i]=0; done
  for ((i=${#ver2[@]}; i<3; i++)); do ver2[i]=0; done
  
  for ((i=0; i<3; i++)); do
    if ((ver1[i] < ver2[i])); then return 0; fi # A < B is true (0 in bash usually means success, but here we want boolean semantics. Let's stick to bash convention: 0 is TRUE/SUCCESS, 1 is FALSE/FAILURE)
    # Wait, the convention in bash is: 0 is SUCCESS (true), non-zero is FAILURE (false).
    # Function returns 0 (success) if A < B.
    if ((ver1[i] > ver2[i])); then return 1; fi
  done
  
  return 1 # A >= B
}

# Check for updates from GitHub Pages
# Checks weekly for a new version and self-updates if available.
# Uses state file in ~/.runcmd/state.json to track last check time and current version.
#
# Process:
#   1. Ensure state directory exists
#   2. Check if update check is needed (time based)
#   3. Fetch remote version.txt
#   4. Compare versions
#   5. If newer, download and replace self
#   6. Update state file
check_for_updates() {
  # Skip update check if explicitly disabled or in debug/CI environments
  [[ "${RUNCMD_NO_UPDATE:-0}" == "1" ]] && return 0
  
  mkdir -p "$RUNCMD_HOME"
  
  # Initialize or read state
  local last_check=0
  local current_version="0.0.0"
  
  if [[ -f "$RUNCMD_STATE" ]]; then
    # Simple JSON parsing using grep/cut since we want to avoid complex dependencies for this core function
    # or rely on python since it's already a dependency
    if command_exists python3; then
      last_check=$(python3 -c "import json, sys; print(json.load(open('$RUNCMD_STATE')).get('last_check', 0))" 2>/dev/null || echo 0)
      current_version=$(python3 -c "import json, sys; print(json.load(open('$RUNCMD_STATE')).get('current_version', '0.0.0'))" 2>/dev/null || echo "0.0.0")
    fi
  fi
  
  local now
  now=$(date +%s)
  
  if (( (now - last_check) < UPDATE_CHECK_INTERVAL )); then
    return 0
  fi
  
  if ! command_exists curl; then
     log_info "Skipping update check: curl not found."
     return 0
  fi

  log_info "Checking for updates..."
  
  # Fetch remote version
  local remote_version
  remote_version=$(curl -fsSL --connect-timeout 3 --max-time 5 "$UPDATE_URL_BASE/version.txt" || echo "")
  
  if [[ -z "$remote_version" ]]; then
    log_info "Failed to check for updates (network issue or timeout)."
    # Update last check anyway to prevent retry on every run
    # Write state safely
     echo "{\"last_check\": $now, \"current_version\": \"$current_version\"}" > "$RUNCMD_STATE"
    return 0
  fi
  
  # Clean up version string
  remote_version=$(echo "$remote_version" | tr -d '[:space:]')
  
  # Check if update is needed
  # version_lt returns 0 (true) if current < remote
  if version_lt "$current_version" "$remote_version"; then
     # Perform update
     log_info "New version available: $remote_version (current: $current_version). Updating..."
     
     local temp_script
     temp_script=$(mktemp)
     
     if curl -fsSL "$UPDATE_URL_BASE/runcmd.sh" -o "$temp_script"; then
       # Verify it looks like a script
       if grep -q "runcmd.sh" "$temp_script"; then
         chmod +x "$temp_script"
         
         # Atomic replacement
         # Note: Replacing the running script in bash is generally safe-ish if we exec the new one or if the OS handles it (Unix usually does)
         # However, to be cleaner, we can overwrite the file
         cat "$temp_script" > "$script_path"
         
         log_info "Updated to version $remote_version."
         current_version="$remote_version"
       else
         log_error "Downloaded update appears invalid."
       fi
       rm -f "$temp_script"
     else
       log_error "Failed to download update."
     fi
  else
    log_info "Runcmd is up to date ($current_version)."
  fi
  
  # Update state
  echo "{\"last_check\": $now, \"current_version\": \"$current_version\"}" > "$RUNCMD_STATE"
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

  printf '%s\n' "$candidate"
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

# Find the Biome configuration file in common locations
# Searches for biome.json in target directory, current directory, and script directory
# Args:
#   $1: Target file path to find Biome config for
# Returns:
#   Path to biome.json on stdout if found, empty string otherwise
find_biome_config() {
  local target_file="$1"
  local target_dir
  target_dir=$(dirname "$target_file")

  local candidate
  local configs=("$target_dir/biome.json" "$current_dir/biome.json" "$script_dir/biome.json")

  for candidate in "${configs[@]}"; do
    if [[ -f $candidate ]]; then
      printf '%s\n' "$candidate"
      return
    fi
  done

  printf '\n'
}

# Run Biome migration on the codebase
# Executes the Biome migrate command with appropriate configuration
# Args:
#   $1: Path to Biome configuration file (optional)
# Returns:
#   None
# Exits:
#   1 if migration fails
run_migration() {
  local biome_config_path="$1"
  log_info "Running Biome migration..."

  local args=(migrate --write)
  if [[ -n $biome_config_path ]]; then
    args+=(--config-path "$biome_config_path")
  fi

  if bunx --silent @biomejs/biome "${args[@]}"; then
    log_info "Migration completed successfully."
    return
  fi

  log_error "Migration failed."
  exit 1
}

# Safely format a shell script using shfmt with atomic updates and rollback protection
# Creates backups, validates syntax, and only replaces originals on successful formatting.
# Designed to handle the edge case of formatting the currently executing script.
#
# PROCESS:
#   1. Create secure temporary files in same directory (avoid cross-device issues)
#   2. Backup original file atomically
#   3. Format to temporary file using available shfmt (system or bunx)
#   4. Validate syntax of formatted result with bash -n
#   5. Atomic replace if validation passes, otherwise restore from backup
#
# SAFETY FEATURES:
#   - Atomic file operations to prevent corruption
#   - Syntax validation before replacement
#   - Automatic rollback on any failure
#   - Proper cleanup of temporary files via trap
#   - Preserves executable permissions
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
safe_format_file() {
  local file_path="$1"
  local temp_file
  local backup_file
  local format_success=0

  # Create temporary files in the same directory to avoid cross-device issues
  temp_file=$(mktemp "${file_path}.tmp.XXXXXX") || return 1
  backup_file=$(mktemp "${file_path}.bak.XXXXXX") || return 1

  # Store temp file paths in a global array for cleanup
  TEMP_FILES_ARRAY+=("$temp_file" "$backup_file")

  # Ensure cleanup on exit - function to remove temp files
  cleanup_on_exit() {
    for file in "${TEMP_FILES_ARRAY[@]}"; do
      rm -f "$file" 2>/dev/null || true
    done
  }
  trap cleanup_on_exit EXIT

  # Create backup of original file
  if ! cp "$file_path" "$backup_file" 2>/dev/null; then
    log_error "Failed to create backup of '$file_path'"
    return 1
  fi

  # Try to format to temporary file
  if command_exists shfmt; then
    if shfmt -bn -ci -i 2 -s "$file_path" >"$temp_file" 2>/dev/null; then
      format_success=1
    fi
  else
    if bunx --silent shfmt -bn -ci -i 2 -s "$file_path" >"$temp_file" 2>/dev/null; then
      format_success=1
    fi
  fi

  if ((format_success)); then
    # Verify the formatted file is valid bash script
    if bash -n "$temp_file" 2>/dev/null; then
      # Atomic replace using mv
      if mv "$temp_file" "$file_path" 2>/dev/null; then
        log_info "Successfully formatted and safely updated: $(basename "$file_path")"
        rm -f "$backup_file" 2>/dev/null || true
        chmod +x "$file_path"
        return 0
      else
        log_error "Failed to replace original file: $(basename "$file_path")"
        # Restore from backup
        mv "$backup_file" "$file_path" 2>/dev/null || true
        chmod +x "$file_path"
        return 1
      fi
    else
      log_error "Formatted file failed syntax check: $(basename "$file_path")"
      # Restore from backup
      mv "$backup_file" "$file_path" 2>/dev/null || true
      chmod +x "$file_path"
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
  local skipped_count=0
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

  # Check if shfmt is available
  if ! command_exists shfmt; then
    if ! command_exists bunx; then
      log_error "Neither 'shfmt' nor 'bunx' is available for shell formatting."
      return 1
    fi
    log_info "Using bunx shfmt for shell formatting..."
  fi

  # Format each shell script
  for shell_file in "${shell_files[@]}"; do
    local rel_path="${shell_file#"$search_dir"/}"

    # Handle the currently executing script specially
    if [[ $shell_file == "$script_path" ]]; then
      log_info "Safely formatting currently executing script: $rel_path"
      ((self_format_attempted++))
      if safe_format_file "$shell_file"; then
        ((formatted_count++))
      else
        ((failed_count++))
      fi
      continue
    fi

    log_info "Formatting shell script: $rel_path"

    local format_success=0
    if command_exists shfmt; then
      if shfmt -w -bn -ci -i 2 -s "$shell_file" 2>/dev/null; then
        format_success=1
      fi
    else
      if bunx --silent shfmt -w -bn -ci -i 2 -s "$shell_file" 2>/dev/null; then
        format_success=1
      fi
    fi

    if ((format_success)); then
      log_info "Successfully formatted: $rel_path"
      ((formatted_count++))
    else
      log_error "Failed to format: $rel_path"
      ((failed_count++))
    fi
  done

  # Report summary
  log_info "Shell formatting summary:"
  log_info "  - Formatted: $formatted_count scripts"
  log_info "  - Skipped: $skipped_count scripts"
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

# Run Biome check on a target file
# Executes the Biome check command with appropriate configuration and runs migration first
# Args:
#   $1: Path to target file to check
#   $2: Path to Biome configuration file (optional)
# Returns:
#   None
# Exits:
#   1 if checking fails
run_check() {
  local target_file="$1"
  local biome_config_path="$2"
  log_info "Running Biome check on '$target_file'..."

  local args=(check --unsafe --write)
  if [[ -n $biome_config_path ]]; then
    args+=(--config-path "$biome_config_path")
  fi
  args+=("$target_file")

  run_migration "$biome_config_path"

  if bunx --silent @biomejs/biome "${args[@]}"; then
    log_info "Checking completed successfully."
    return
  fi

  log_error "Checking failed."
  exit 1
}

# Run JSON sort check on files in target directory
# Uses json-sort-cli to sort and format JSON files recursively
# Args:
#   $1: Target directory path to search for JSON files
# Returns:
#   0 on success, 1 on failure
# Exits:
#   1 if JSON sorting fails
run_json_sort() {
  local target_dir="$1"
  log_info "Running Json Sort check on '$target_dir'..."

  local args=("$target_dir/**/*.json")

  if bunx --silent json-sort-cli "${args[@]}"; then
    log_info "Json Sort completed successfully."
    return 0
  fi

  log_error "Json Sort failed."
  exit 1
}

# Start timing execution if debug mode is enabled
# Captures the current time with millisecond precision using Python
# Globals:
#   DEBUG: Flag indicating if debug mode is enabled
#   START_TIME: Global variable to store start time in milliseconds
# Returns:
#   None
start_timer() {
  if [[ -n $DEBUG ]] && [[ $DEBUG != "0" ]] && [[ $DEBUG != "false" ]]; then
    START_TIME=$(python3 -c 'import time; print(int(time.time() * 1000))')
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
  if [[ -n $DEBUG ]] && [[ $DEBUG != "0" ]] && [[ $DEBUG != "false" ]]; then
    local end_time
    end_time=$(python3 -c 'import time; print(int(time.time() * 1000))')
    local elapsed_ms=$((end_time - START_TIME))

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

# Ensure curl is installed, installing it if necessary
# Checks for curl and installs it using available package managers if missing
# Supports apt-get (Debian/Ubuntu), yum (RHEL/CentOS), and brew (macOS)
# Globals:
#   None
# Returns:
#   None
# Exits:
#   1 if curl installation fails or no supported package manager is found
ensure_curl_installed() {
  if command_exists curl; then
    log_info "'curl' is already installed."
    return
  fi

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
}

# Ensure Bun is installed, installing it if necessary
# Checks for Bun and installs it from the official source if missing
# Also sources the Bun environment and updates PATH
# Globals:
#   BUN_INSTALL: Path to Bun installation directory
#   BUN_INSTALL_SCRIPT: URL to Bun installation script
# Returns:
#   None
# Exits:
#   1 if Bun installation fails or command is unavailable after installation
ensure_bun_installed() {
  if command_exists bun; then
    log_info "Bun is installed."
    return
  fi

  log_info "Bun is not installed. Installing now..."
  ensure_curl_installed

  if curl -fsSL "$BUN_INSTALL_SCRIPT" | bash >/dev/null 2>&1; then
    log_info "Bun has been successfully installed."
    if [[ -f "$BUN_INSTALL/env" ]]; then
      # shellcheck disable=SC1091
      source "$BUN_INSTALL/env"
      export PATH="$BUN_INSTALL/bin:$PATH"
      hash -r
      log_info "'bun' environment sourced."
    else
      log_error "Failed to source 'bun' environment. Please add '$BUN_INSTALL/bin' to your PATH."
      exit 1
    fi
  else
    log_error "Failed to install Bun."
    exit 1
  fi

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
  if [ ${#BUN_ARGS[@]} -eq 0 ]; then
    bun run "$target"
    result=$?
  else
    bun run "$target" "${BUN_ARGS[@]}"
    result=$?
  fi
  end_timer
  ((result == 0)) && log_info "Script execution completed successfully." || log_info "Failed to execute '$target' [$result]."
  return $result
}

# Run check mode operations including shell script formatting, JSON sorting, and Biome check
# Formats shell scripts in target and current directories, sorts JSON files, then runs Biome check
# Args:
#   $1: Path to target file for Biome check
# Returns:
#   None
run_check_mode() {
  local target="$1"
  local target_dir
  target_dir=$(dirname "$target")

  ensure_bun_installed

  local biome_config
  biome_config=$(find_biome_config "$target")

  if [[ -n $DEBUG ]] && [[ $DEBUG != "0" ]] && [[ $DEBUG != "false" ]]; then
    if [[ -n $biome_config ]]; then
      log_info "Using Biome config: '$biome_config'"
    else
      log_info "No Biome config found, using default configuration."
    fi
  fi

  # Format shell scripts in the target directory first
  log_info "Starting shell script formatting in check mode..."
  if ! format_shell_scripts "$target_dir"; then
    log_error "Shell script formatting failed, but continuing with Biome check..."
  fi

  # Also check scripts in the current directory
  if [[ $target_dir != "$current_dir" ]]; then
    if ! format_shell_scripts "$current_dir"; then
      log_error "Shell script formatting in current directory failed, but continuing with Biome check..."
    fi
  fi

  # Sort JSON files in the target directory
  run_json_sort "$target_dir"

  # Run the original Biome check
  run_check "$target" "$biome_config"

  local shell_result=$?
  if ((shell_result == 0)); then
    log_info "Check mode completed successfully with shell formatting."
  else
    log_info "Check mode completed, but some shell formatting issues occurred."
  fi
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
      +help | +h)
        usage
        ;;
      +runme | +r)
        if [[ $# -lt 2 ]]; then
          log_error "Option '$1' requires a value."
          usage
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
        ;;
      *)
        BUN_ARGS+=("$1")
        ;;
    esac
    shift || true
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
      export "${line?}"
      log_info "${export_prefix}${line%%=*}"
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

  if load_env_file "$current_env_file" "Loading environment variables from current directory: $current_env_file" "Exported (overwrites): "; then
    loaded_any=1
  fi

  if ((!loaded_any)); then
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
#      - Check mode: formatting, validation, Biome checks
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

  # Check for updates
  check_for_updates

  parse_args "$@"
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
