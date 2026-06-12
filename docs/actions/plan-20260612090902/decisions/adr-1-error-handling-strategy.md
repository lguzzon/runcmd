# ADR-1: error-handling-strategy

**Status**: Draft
**Date**: 20260612090902
**Context**: Error handling in runcmd.sh is inconsistent: path-resolution helpers (resolve_path, resolve_default_script, resolve_default_in_dir, resolve_script_path) use `exit 1` (process-killing), safe_format_file uses `return 1` (caller-delegated), and run_check_mode treats format failures as non-fatal but JSON sort failures trigger `exit 1`. A unified convention is needed to prevent drift and make behavior predictable for contributors.
**Decision**: TBD
**Consequences**: TBD
