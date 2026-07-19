# Test Intelligence Reference

## Purpose

Run the minimum set of tests required to validate the change, while ensuring no regression slips through.

## Test Impact Analysis

1. Identify changed files and packages from `git diff --name-only main..HEAD`.
2. Map changed files to their owning workspace or package.
3. Run only the tests for the affected workspace/package, not the entire suite.

```bash
# Example: run only affected workspace tests
bun test apps/api/src/bot/
forge test --match-test test_StrategyValidation
```

If path filtering is unavailable, run the full workspace test suite but prioritize it.

## Regression Test Requirement

For issues labeled `type:bug` or `fix`:
1. Write a test that reproduces the bug before applying the fix. The test must fail on the unmodified codebase.
2. Commit the failing test first.
3. Apply the fix.
4. Verify the test passes.
5. Do not squash the regression test into the fix commit; keep it as a separate commit for traceability.

## Coverage Gap Analysis

After running tests:
1. Inspect the coverage report for changed lines.
2. If any new line is uncovered, add or update a test to cover it.
3. If coverage cannot be measured, note the gap in the PR description.

## Flaky Test Detection

If a test fails on the first run but passes on the second run without code changes:
1. Retry up to `recovery.flaky_test_retries` times.
2. If it passes on retry, mark the test as flaky in the PR description and do not block merge.
3. If it fails consistently, treat as a real failure.
