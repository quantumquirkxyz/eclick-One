# Quality Gates Reference

## Purpose

Automated checks that run before PR/MR creation or merge to prevent low-quality or risky changes from entering the main branch.

## Coverage Delta Gate

If the diff reduces test coverage by more than `coverage_delta_block_pct` (default 2%), the agent must stop and report BLOCKED. The PR description must include the coverage before/after/gap matrix.

```bash
# Example: run coverage and compare
bun test --coverage
git diff main..HEAD --stat
```

If a coverage report is unavailable, note the gap in the PR description and keep the checkbox unchecked.

## Breaking Change Gate

If the diff touches any of the following, require the `breaking-change` label:
- Public exports in library packages
- REST API route signatures or request/response schemas
- GraphQL schema mutations or queries
- Database migration files
- Smart contract function signatures or events
- CLI argument interfaces

If the label is missing, stop and request human approval.

## Changelog Gate

If `require_changelog_entry` is true in config:
1. Open `CHANGELOG.md` (or `CHANGELOG.md` equivalent).
2. Verify there is an unreleased entry that matches this issue number or title.
3. If missing, add a placeholder entry and note it in the PR body, or report BLOCKED.

## License Compliance Gate

If the diff adds or updates dependencies:
1. Inspect `package.json`, `foundry.toml`, or equivalent.
2. Verify each new dependency's license against the project's approved list (e.g., MIT, Apache-2.0, BSD-3-Clause).
3. If a disallowed license is found (e.g., AGPL, GPL-3.0 in a proprietary project), report BLOCKED with the package name and license.

## PR Size Gate

If added lines exceed `pr_size_block_loc` (default 500), stop and report the PR/MR URL with a request for human approval. If added lines exceed `pr_size_warning_loc` (default 300), note the warning in the PR description.
