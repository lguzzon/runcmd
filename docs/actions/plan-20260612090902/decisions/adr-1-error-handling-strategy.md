# ADR-1: error-handling-strategy

**Status**: Accepted
**Date**: 20260612090902
**Context**: Error handling in runcmd.sh is inconsistent: path-resolution helpers (resolve_path, resolve_default_script, resolve_default_in_dir, resolve_script_path) use `exit 1` (process-killing), safe_format_file/format_shell_scripts use `return 1` (caller-delegated), and run_oxfmt/run_lint/run_json_sort use `exit 1` despite being called from run_check_mode which could handle failures gracefully. A unified convention is needed.

**Decision**: Two-tier error handling:

- **Tier 1 — Fatal** (`exit 1`): Use for pre-execution setup failures where the process cannot meaningfully continue. Path resolution, dependency availability (bun/shfmt), environment validation. These fire before any script execution begins and have no recovery path.
- **Tier 2 — Delegate** (`return 1`): Use for operational failures where the caller can decide severity. All format/lint/check operations. Callers (run_check_mode, format_shell_scripts) must handle `return 1` with `if ! function_call` patterns — never let a utility function call `exit 1` directly.
- Document convention in script header under a `## ERROR HANDLING CONVENTION` section.

**Consequences**:

- `run_oxfmt()`, `run_lint()`, `run_json_sort()` must change from `exit 1` to `return 1` and update their doc headers.
- `run_check_mode()` must change from direct calls to `if ! run_oxfmt ...` / `if ! run_lint ...` etc., logging errors but continuing only for non-fatal steps.
- Path resolution helpers keep `exit 1` — no change.
- New functions follow the convention: fatal for setup, delegate for operations.
- ADR serves as single source of truth for future contributors.
