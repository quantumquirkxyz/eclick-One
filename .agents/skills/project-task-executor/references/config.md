# Project Task Executor Configuration

Use `.project-task-executor-config.json` in the repository root when invocation arguments are missing or repository-specific defaults are needed.

## Recommended Shape

```json
{
  "repo_url": "https://github.com/InitiumLab/OneTrade-Backend",
  "project_id": 1,
  "main_branch": "main",
  "git_token_env": "GITHUB_TOKEN",
  "ci_cd_required": true,
  "code_review_required": true,
  "autonomous_merge": false,
  "labels": {
    "ready": "status:ready-to-start",
    "in_progress": "status:in-progress",
    "under_review": "status:under-review",
    "done": "status:done",
    "failed": "status:failed",
    "exclude": ["blocked", "wontfix", "duplicate"],
    "priority": ["priority:high", "priority:medium", "priority:low"]
  },
  "linter_config": {
    "python": "pep8",
    "typescript": "eslint"
  },
  "pr_template": {
    "title": "[Issue #{issue_id}] {issue_title}",
    "description": "## Summary\n{changes_summary}\n\n## Changes\n{file_changes}\n\n## Validation Checklist\n- [ ] Code follows repository standards.\n- [ ] All tests pass.\n- [ ] Documentation updated or not required.\n\nCloses #{issue_id}"
  },
   "retry": {
    "max_attempts": 3,
    "initial_delay_ms": 1000,
    "backoff_multiplier": 2,
    "rate_limit_wait_ms": 60000
  },
  "ci_poll_timeout_minutes": 10,
  "pr_size_warning_loc": 300,
  "pr_size_block_loc": 500,
  "coverage_threshold": 0.80,
  "workspaces": {
    "apps/api": {
      "typecheck": "bun run typecheck",
      "lint": "bun run lint",
      "test": "bun test"
    },
    "apps/web": {
      "typecheck": "bun run typecheck",
      "lint": "bun run lint",
      "test": "bun test"
    },
    "apps/agents": {
      "typecheck": "bun run typecheck",
      "lint": "bun run lint",
      "test": "bun test"
    },
    "contracts": {
      "typecheck": "forge build",
      "lint": "forge fmt --check",
      "test": "forge test"
    }
  },
  "recovery": {
    "max_attempts_per_issue": 3,
    "checkpoint_on_failure": true,
    "auto_rebase_before_merge": true,
    "flaky_test_retries": 2
  },
  "orchestration": {
    "invoke_reviewer_after_pr": true,
    "invoke_qa_after_ci_pass": false,
    "invoke_docs_after_merge": false,
    "review_timeout_minutes": 15
  },
  "quality_gates": {
    "coverage_delta_block_pct": 2.0,
    "require_changelog_entry": true,
    "breaking_change_label": "breaking-change",
    "license_compliance_check": true
  },
  "batch": {
    "enabled": false,
    "max_batch_size": 5,
    "batch_issues_max_loc": 800,
    "auto_split_above_loc": 500
  },
  "checkpoints": {
    "enabled": false,
    "after_implementation": false,
    "after_pr_creation": true,
    "after_ci_pass": true,
    "before_merge": true
  },
  "multi_platform": {
    "enabled": false,
    "mirror_platforms": ["github", "gitlab"],
    "sync_issues": false,
    "sync_labels": false
  },
  "semantic_release": {
    "enabled": false,
    "provider": "github",
    "ci_command": "npm run release",
    "verify_changelog": true
  }
}
```

## Security

- Prefer `git_token_env` over `git_token`; read the token from the named environment variable only when an authenticated CLI is unavailable.
- If an existing config contains `git_token`, do not print it, do not commit it, and recommend replacing it with `git_token_env`.
- Keep `.skill-state.json` and `skill-execution.log` uncommitted unless the user explicitly asks for audit artifacts to be versioned.

## State File

Use `.skill-state.json` to resume after interruptions. The strategic state file includes recovery zones for partial work preservation:

```json
{
  "repo_url": "https://github.com/org/repo",
  "project_id": 1,
  "current_issue_id": 42,
  "branch": "feature/42-strategy-validation",
  "pr_url": "https://github.com/org/repo/pull/123",
  "status": "validating",
  "attempt": 1,
  "updated_at": "2026-07-18T00:00:00Z",
  "phase": "validate",
  "recovery_zone": {
    "partial_diff": "diff --git a/src/bot/strategy.py...",
    "last_successful_step": "4.6",
    "next_step": "4.7",
    "diagnostics": "CI failed on typecheck: unused import in strategy.py",
    "checkpoint_files": ["src/bot/strategy.py", "tests/strategy_test.py"]
  },
  "execution_history": [
    {
      "timestamp": "2026-07-18T10:00:00Z",
      "phase": "implement",
      "duration_seconds": 120,
      "outcome": "success",
      "files_changed": 3
    }
  ]
}
```

## Execution Log

Use `.execution-log.json` to track performance and learning across issues:

```json
[
  {
    "issue_id": 42,
    "repo": "org/repo",
    "branch": "feature/42-strategy-validation",
    "started_at": "2026-07-18T10:00:00Z",
    "finished_at": "2026-07-18T10:45:00Z",
    "total_duration_seconds": 2700,
    "phases": {
      "scan": {"duration_seconds": 10, "issues_found": 12},
      "prioritize": {"duration_seconds": 2},
      "implement": {"duration_seconds": 1200, "files_changed": 3},
      "commit": {"duration_seconds": 5},
      "validate": {"duration_seconds": 1200, "ci_polls": 12},
      "merge": {"duration_seconds": 30}
    },
    "ci_failures": ["typecheck"],
    "review_iterations": 1,
    "final_status": "done"
  }
]
```

Keep both `.skill-state.json` and `.execution-log.json` local unless explicitly asked to version audit artifacts.
