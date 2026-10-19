#!/usr/bin/env bash
# Run a GitHub Actions workflow locally with nektos/act, before pushing.
#
# Prerequisites: docker (running) and act (`mise use -g act`). The runner image
# and platform flags come from .actrc at the repo root.
#
# publish.yml cannot be driven by act: it triggers on `workflow_run`, which act
# does not implement. Every job in ci.yml can.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage: scripts/run-workflow-locally.sh [options] [-- extra act args]

  -e, --event <name>   GitHub event to simulate (default: push)
  -j, --job <name>     Run one job only (default: every job for the event)
  -l, --list           List the jobs act can run, then exit
  -h, --help           Show this help

Examples:
  scripts/run-workflow-locally.sh                  every CI job, push event
  scripts/run-workflow-locally.sh -j website       one job
  scripts/run-workflow-locally.sh -e pull_request  a pull-request run
  scripts/run-workflow-locally.sh -l               what can run here
EOF
}

# act drives docker. The calling shell may have joined the docker group after it
# started, so re-enter under sg when the socket is not directly reachable.
if ! docker info >/dev/null 2>&1; then
  if getent group docker 2>/dev/null | grep -qE "(^|:)${USER}(,|$)"; then
    exec sg docker -c "$(printf '%q ' "$0" "$@")"
  fi
  die "docker is not reachable. Start it with 'sudo systemctl start docker' and add yourself with 'sudo usermod -aG docker $USER', then open a new shell."
fi

command -v act >/dev/null 2>&1 || die "act is not installed. Run: mise use -g act"

event=push
act_args=()
while (($#)); do
  case "$1" in
    -e | --event)
      event="${2:?--event needs a name}"
      shift 2
      ;;
    -j | --job)
      act_args+=(-j "${2:?--job needs a name}")
      shift 2
      ;;
    -l | --list) exec act -l ;;
    -h | --help)
      usage
      exit 0
      ;;
    --)
      shift
      act_args+=("$@")
      break
      ;;
    *)
      act_args+=("$1")
      shift
      ;;
  esac
done

printf 'act: event=%s repo=%s\n' "$event" "$REPO_ROOT"
exec act "$event" "${act_args[@]}"
