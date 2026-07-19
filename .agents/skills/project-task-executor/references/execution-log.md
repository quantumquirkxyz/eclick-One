# Execution Memory Reference

## Purpose

Track performance, failure patterns, and optimization opportunities across issues so the skill improves over time.

## Log Schema

Append one entry per completed phase to `.execution-log.json`:

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

## Usage

- **Slow phase detection**: if `validate` consistently exceeds 50% of total time, investigate CI optimization.
- **Frequent CI failures**: if an area of code fails CI more than 30% of the time, suggest additional tests or pre-commit hooks.
- **Review churn**: if `review_iterations` > 2, suggest pre-PR self-review checklist.
- **Batch efficiency**: if `total_duration_seconds` per issue is high, recommend batch mode for small follow-up issues.

## Privacy

Never log raw tokens, credentials, or full diffs. Log only metadata, durations, counts, and failure categories.
