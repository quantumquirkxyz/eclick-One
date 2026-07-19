# Batch Orchestrator Reference

## Purpose

Process multiple small issues together or split oversized issues automatically to maximize throughput and minimize PR overhead.

## Batch Mode

When `batch.enabled` is true in config:

1. Scan and prioritize as usual.
2. Instead of selecting the single highest-priority issue, select up to `batch.max_batch_size` issues that:
   - Have no dependencies among each other
   - Touch disjoint file paths or packages
   - Together stay under `batch.batch_issues_max_loc` (default 800 lines)
3. Implement all selected issues on a single shared branch: `feature/<id1>-<id2>-<id3>-batch`.
4. Open one PR/MR with a combined title: `[Batch #42 #43 #44] <short summary>`.
5. Run validation once for the entire batch.

### Batch Validation

- Each issue in the batch must pass its own acceptance criteria.
- If one issue in the batch fails CI, split the batch: isolate the failing issue into its own branch and re-validate.

## Auto-Split

When a single issue's estimated diff exceeds `batch.auto_split_above_loc` (default 500 lines):

1. Pause before implementation.
2. Analyze the issue body for natural split points (e.g., separate endpoints, separate contracts, separate UI components).
3. Suggest a split plan in the issue comment:

```markdown
This issue exceeds the PR size threshold. Suggested split:

- Part 1: <scope A> (estimated 200 lines)
- Part 2: <scope B> (estimated 250 lines)

Proceed with split or request human approval to override?
```

4. If the human approves, create separate issues or work on separate branches and open separate PRs.
5. If the human overrides, proceed with the single PR and note the exception.
