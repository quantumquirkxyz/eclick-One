# Acceptance Criteria Reference

## Parsing Checklists From Issue Bodies

1. Extract lines that start with `- [ ]` or `- [x]` from the issue body.
2. Treat unchecked items as acceptance criteria that must be satisfied before the issue can be marked done.
3. Treat checked items as already-completed criteria that should not block progress but may indicate related work.

## Mapping Labels To Acceptance Criteria

| Label pattern | Acceptance implication |
|---------------|------------------------|
| `type:feature` | New user-facing behavior must have tests and documentation. |
| `type:bug` | Fix must include a regression test that fails before the fix. |
| `priority:high` | Must pass all validation commands before PR creation. |
| `status:ready-to-start` | No blocking dependencies or clarifications remain. |
| `status:blocked` | Do not start implementation until the blocker is resolved. |

## Before/After Coverage Matrix

Produce a coverage matrix in the PR validation section when behavior changes:

| Area | Before | After | Gap |
|------|--------|-------|-----|
| Unit tests | count | count | +/- |
| Integration tests | count | count | +/- |
| E2E tests | count | count | +/- |
| Typecheck errors | count | count | +/- |

Populate the matrix by running the workspace test commands before and after the change, or by reading existing coverage reports if the repository tracks them.
