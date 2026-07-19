# Recovery Reference

## Purpose

Preserve partial work and diagnose failures so the agent can resume intelligently instead of restarting from scratch.

## Recovery Zones

When the agent is interrupted (context limit, error, timeout), save a checkpoint to `.skill-state.json`:

```json
{
  "recovery_zone": {
    "partial_diff": "diff --git a/src/bot/strategy.py...",
    "last_successful_step": "4.6",
    "next_step": "4.7",
    "diagnostics": "CI failed on typecheck: unused import in strategy.py",
    "checkpoint_files": ["src/bot/strategy.py", "tests/strategy_test.py"]
  }
}
```

On resume, restore `checkpoint_files` from the working tree before retrying.

## Auto-Rebase

If `recovery.auto_rebase_before_merge` is true:
1. Before merge, run `git rebase main` (or configured default branch).
2. If conflicts are trivial (whitespace, import ordering, version bumps), resolve them automatically.
3. If conflicts are non-trivial (logic overlap, API changes), report BLOCKED with the conflicting files.

## Failure Diagnosis

When a step fails, append to `.skill-state.json` `recovery_zone.diagnostics`:
- The exact command that failed
- The error message or exit code
- Suggested next action (e.g., *"retry step 4.7 after fixing unused import"*)

## Max Attempts

If the same issue fails `recovery.max_attempts_per_issue` times:
1. Stop and report BLOCKED.
2. Include the full `recovery_zone` and `.execution-log.json` entries for this issue.
3. Do not auto-retry further without human approval.
