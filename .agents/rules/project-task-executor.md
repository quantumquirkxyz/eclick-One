# Project Task Executor Rules

Apply these rules while using `/project-task-executor` or `@project-task-executor`. These rules are hard constraints. If a rule conflicts with `SKILL.md`, the rule wins.

## Security And Repository Safety

- Run `git status --short` before edits.
- Preserve unrelated user changes; never revert work you did not create.
- Prefer authenticated CLIs or environment variables for tokens.
- Never print, commit, or write raw tokens into repository config.
- Keep `.skill-state.json`, `.execution-log.json`, and `skill-execution.log` local unless the user explicitly asks to version audit artifacts.
- Do not use destructive Git operations unless the user explicitly requested them.

## Implementation Rules

- Read the issue, relevant code, tests, package scripts, lint/typecheck settings, and repository docs before editing.
- Follow repository coding standards.
- Add or update focused tests for changed behavior.
- Add external libraries only when existing dependencies or local helpers cannot meet the requirement.
- Update dependency manifests when adding libraries.
- Ask for clarification before implementation when acceptance criteria are ambiguous or internally inconsistent.
- Do not implement more than the issue requires. Keep changes minimal.

## Git And PR/MR Rules

- Work on a fresh branch per issue from the current default branch.
- Use `feature/<issue_id>-<short-description>` for feature work.
- Use `fix/<issue_id>-<short-description>` for bug fixes.
- For batch mode, use `feature/<id1>-<id2>-batch`.
- Keep the branch up to date with `main`, `master`, or the configured default branch before PR/MR creation.
- Use English Conventional Commits with a `Closes #<issue_id>` footer.
- Use the PR/MR, comment, and commit templates in `.agents/skills/project-task-executor/references/formats.md`.
- Add labels such as `status:under-review` or `type:feature` only when they exist or repository conventions support creating them.

## Validation Rules

- Run relevant local validation before opening or updating the PR/MR.
- Poll CI/CD until terminal when required by config or branch protection.
- PR/MR validation requires passing CI/CD, no required-review blockers, no known security issue, and no untracked dependency/documentation gap.
- Enforce quality gates: coverage delta, breaking change detection, changelog, and license compliance before merge.
- Do not merge a PR/MR with failing CI, unresolved required reviews, or branch-protection failures.
- If human approval is required, stop after reporting the PR/MR URL, current checks, and requested reviewers.

## Test Rules

- For bug fixes, include a regression test that fails before the fix and passes after.
- Run test impact analysis: execute only tests affected by the changed files when path filtering is available.
- If coverage drops more than `coverage_delta_block_pct`, report BLOCKED.
- Treat flaky test failures as real failures after `recovery.flaky_test_retries` retries.

## Project Update Rules

- Move an issue to in-progress when implementation begins and permissions allow.
- If validation passes and autonomous merge is configured, merge, close the issue, delete the feature branch, and move the project item to done.
- If validation passes but human merge is required, report the PR/MR URL and required human action.
- If validation fails, comment on the issue with the failure summary and keep the issue out of done.

## Orchestration Rules

- Invoke `@reviewer` after PR creation when `orchestration.invoke_reviewer_after_pr` is true and `code_review_required` is true.
- Invoke `@qa` after CI passes when `orchestration.invoke_qa_after_ci_pass` is true and the change touches UI or API behavior.
- Invoke `@docs` after merge when `orchestration.invoke_docs_after_merge` is true and the issue has label `type:feature`.
- Do not proceed past checkpoints when `checkpoints.enabled` is true; wait for human confirmation.

## Error Handling Rules

- Clone/API failure: retry up to three times, then report the command, error, and next manual action.
- Rate limit: wait 60 seconds before retrying; stop if repeated.
- Implementation failure: preserve diagnostics, save a recovery checkpoint, revert only your own changes on the task branch, and report the blocker.
- PR/MR creation failure: correct metadata and retry once before reporting.
- CI/CD failure: fetch logs, summarize the smallest useful error excerpt, fix the branch, commit, push, and revalidate.
- Code review rejection: apply actionable feedback, add regression coverage where appropriate, push, and revalidate.
- Permission failure: report the missing permission and the exact operation that could not complete.

