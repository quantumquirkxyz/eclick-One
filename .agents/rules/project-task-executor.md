# Project Task Executor Rules

Apply these rules while using `/project-task-executor` or `@project-task-executor`.

## Security And Repository Safety

- Run `git status --short` before edits.
- Preserve unrelated user changes; never revert work you did not create.
- Prefer authenticated CLIs or environment variables for tokens.
- Never print, commit, or write raw tokens into repository config.
- Keep `.skill-state.json` and `skill-execution.log` local unless the user explicitly asks to version audit artifacts.
- Do not use destructive Git operations unless the user explicitly requested them.

## Scanner Rules

- Include only open issues.
- Include only issues with `status:ready-to-start`.
- Include only issues with `priority:high`, `priority:medium`, or `priority:low`.
- Exclude issues with `blocked`, `wontfix`, or `duplicate`.
- Use API pagination.
- Capture dependencies from linked issues, project metadata, and issue-body dependency checklists when available.
- If dependency state cannot be determined confidently, mark the issue as blocked for clarification instead of silently skipping it.

## Prioritization Rules

- Resolve dependencies before dependents.
- Sort priority descending: `high`, then `medium`, then `low`.
- For equal priority, select the oldest `created_at` first.
- Treat dependency cycles as blockers.

## Implementation Rules

- Read the issue, relevant code, tests, package scripts, lint/typecheck settings, and repository docs before editing.
- Follow repository coding standards.
- Add or update focused tests for changed behavior.
- Add external libraries only when existing dependencies or local helpers cannot meet the requirement.
- Update dependency manifests when adding libraries.
- Ask for clarification before implementation when acceptance criteria are ambiguous or internally inconsistent.

## Git And PR/MR Rules

- Work on a fresh branch per issue from the current default branch.
- Use `feature/<issue_id>-<short-description>` for feature work.
- Use `fix/<issue_id>-<short-description>` for bug fixes.
- Keep the branch up to date with `main`, `master`, or the configured default branch before PR/MR creation.
- Use English Conventional Commits with a `Closes #<issue_id>` footer.
- Use the PR/MR, comment, and commit templates in `.agents/skills/project-task-executor/references/formats.md`.
- Add labels such as `status:under-review` or `type:feature` only when they exist or repository conventions support creating them.

## Validation Rules

- Run relevant local validation before opening or updating the PR/MR.
- Poll CI/CD until terminal when required by config or branch protection.
- PR/MR validation requires passing CI/CD, no required-review blockers, no known security issue, and no untracked dependency/documentation gap.
- Do not merge a PR/MR with failing CI, unresolved required reviews, or branch-protection failures.
- If human approval is required, stop after reporting the PR/MR URL, current checks, and requested reviewers.

## Project Update Rules

- Move an issue to in-progress when implementation begins and permissions allow.
- If validation passes and autonomous merge is configured, merge, close the issue, delete the feature branch, and move the project item to done.
- If validation passes but human merge is required, report the PR/MR URL and required human action.
- If validation fails, comment on the issue with the failure summary and keep the issue out of done.

## Error Handling Rules

- Clone/API failure: retry up to three times, then report the command, error, and next manual action.
- Rate limit: wait 60 seconds before retrying; stop if repeated.
- Implementation failure: preserve diagnostics, revert only your own changes on the task branch, and report the blocker.
- PR/MR creation failure: correct metadata and retry once before reporting.
- CI/CD failure: fetch logs, summarize the smallest useful error excerpt, fix the branch, commit, push, and revalidate.
- Code review rejection: apply actionable feedback, add regression coverage where appropriate, push, and revalidate.
- Permission failure: report the missing permission and the exact operation that could not complete.
