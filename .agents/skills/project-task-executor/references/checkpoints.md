# Human Checkpoint Reference

## Purpose

Balance autonomous execution with human oversight by pausing at critical decision points.

## Checkpoint Stages

When `checkpoints.enabled` is true, pause and request human approval at:

| Stage | Config Key | Default | Question |
|-------|-----------|---------|----------|
| After implementation | `after_implementation` | false | *"Implementation complete. Diff: `<summary>`. Proceed with commit?"* |
| After PR creation | `after_pr_creation` | true | *"PR/MR `<url>` created. Authorize merge when CI passes?"* |
| After CI pass | `after_ci_pass` | true | *"CI passed. Proceed with merge?"* |
| Before merge | `before_merge` | true | *"Ready to merge `<branch>` into `main`. Confirm?"* |

## Checkpoint Format

When pausing, post a comment to the issue and output this JSON:

```json
{
  "checkpoint": "after_pr_creation",
  "pr_url": "https://github.com/org/repo/pull/123",
  "branch": "feature/42-strategy-validation",
  "question": "Authorize merge when CI passes?"
}
```

Wait for human response before proceeding. If the human rejects, report BLOCKED with their feedback.

## Auto-Approval

If a checkpoint is disabled in config, proceed without pausing. If enabled, never auto-approve; always wait for explicit human confirmation.
