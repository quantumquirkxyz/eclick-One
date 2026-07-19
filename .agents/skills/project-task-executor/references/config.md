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
  }
}
```

## Security

- Prefer `git_token_env` over `git_token`; read the token from the named environment variable only when an authenticated CLI is unavailable.
- If an existing config contains `git_token`, do not print it, do not commit it, and recommend replacing it with `git_token_env`.
- Keep `.skill-state.json` and `skill-execution.log` uncommitted unless the user explicitly asks for audit artifacts to be versioned.

## State File

Use `.skill-state.json` to resume after interruptions:

```json
{
  "repo_url": "https://github.com/org/repo",
  "project_id": 1,
  "current_issue_id": 42,
  "branch": "feature/42-strategy-validation",
  "pr_url": "https://github.com/org/repo/pull/123",
  "status": "validating",
  "attempt": 1,
  "updated_at": "2026-07-18T00:00:00Z"
}
```
