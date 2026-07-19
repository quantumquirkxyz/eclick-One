---
name: project-task-executor
description: "IMMEDIATE EXECUTION on skill invocation. Scans GitHub/GitLab project board, picks the highest-priority ready issue by dependency order and priority, implements it with focused tests, commits with Conventional Commits, opens a validated PR/MR, updates project status, and reports the outcome. Do not describe — execute."
---

## Immediate Execution

Execute the full workflow now. Do not ask for confirmation. Do not describe the plan — run it.

## 1. Prepare

1. Load `.skill-state.json` if present. If the recorded issue/branch/PR is still valid, resume from that state.
2. If the target repo is not already present locally, clone it.
3. Fetch the default branch. Determine if it is `main`, `master`, or the configured branch.
4. Verify API access: run `gh auth status`. If it fails, run `glab auth status`. If both fail, check for `GITHUB_TOKEN`, `GITLAB_TOKEN`, or `GIT_TOKEN` environment variables. If none work, report BLOCKED.

## 2. Scan

Fetch all open project-board issues with pagination. Keep only issues that:
- are **open**
- have label `status:ready-to-start`
- have one of `priority:high`, `priority:medium`, or `priority:low`
- do **not** have `blocked`, `wontfix`, or `duplicate`

### GitHub

```bash
gh issue list --repo owner/repo --state open --label "status:ready-to-start" --limit 100
```

Paginate with `--page` until empty. For each issue, fetch details:

```bash
gh issue view <number> --repo owner/repo --json number,title,body,labels,state,createdAt
```

### GitLab

```bash
glab issue list --project-id <id> --state opened --label "status:ready-to-start" --per-page 100
```

Paginate with `--page`. For each issue, fetch details:

```bash
glab issue view <iid> --project-id <id> --json iid,title,description,labels,state,createdAt
```

### Normalization

For each qualifying issue, construct this JSON object:

```json
{
  "issue_id": 42,
  "title": "Implement trading bot strategy validation",
  "priority": "high",
  "labels": ["enhancement", "status:ready-to-start", "priority:high"],
  "dependencies": [],
  "status": "open",
  "created_at": "2026-07-18T00:00:00Z",
  "url": "https://github.com/org/repo/issues/42"
}
```

Capture dependencies from linked issues, project metadata, and issue-body dependency checklists. Save all normalized issues to `issues.json`.

### Filter

Exclude issues with:
- `status` not `open`
- missing `status:ready-to-start` label
- missing `priority:high`, `priority:medium`, or `priority:low`
- labels `blocked`, `wontfix`, or `duplicate`

## 3. Prioritize

Sort the filtered issues deterministically:

1. **Dependencies first**: an issue with unresolved dependencies must come after its dependencies. Detect cycles; if a cycle exists, report BLOCKED with the cycle members.
2. **Priority descending**: `high` → `medium` → `low`.
3. **Age ascending**: for equal priority, select the oldest `created_at` first.
4. **ID ascending**: if priority and date tie, use lower `issue_id` first.

The selected issue is the first item in the sorted list. If the list is empty, report BLOCKED with "no ready issues".

## 4. Implement

1. Move the selected issue to in-progress:

```bash
gh issue edit <number> --repo owner/repo --add-label "status:in-progress" --remove-label "status:ready-to-start"
```

2. Create the issue branch: `feature/<id>-<short-description>` for features, `fix/<id>-<short-description>` for bug fixes.

```bash
git checkout -b feature/42-short-description main
```

3. Read the issue description, relevant source code, tests, package scripts, and lint/typecheck settings.
4. Read `.agents/rules/project-task-executor.md`, `.agents/rules/git-workflow.md`, and `.agents/skills/project-task-executor/references/formats.md`.
5. Read `.agents/skills/project-task-executor/references/monorepo.md` for workspace-aware validation commands.
6. Implement the smallest production-quality change that satisfies the issue.
7. Add or update focused tests for the changed behavior.
8. Run the validation commands discovered from the repository (typecheck, lint, test).

### Security scan before commit

Before committing, inspect outgoing changes for secrets:

```bash
git diff --cached
```

Check for:
- AWS keys: `AKIA[0-9A-Z]{16}`
- GitHub tokens: `gh[pousr]_[A-Za-z0-9_]{36,}` or `github_pat_[A-Za-z0-9_]{22,}`
- GitLab tokens: `glpat-[A-Za-z0-9_]{20,}`
- Generic secrets: `password=\S+`, `token=\S+` (skip test/spec files)
- Accidental `.env` additions

If any secret is found, report BLOCKED with the file and line. Do not commit.

## 5. Commit And Open PR/MR

### 5.1 Build the commit message

Write the commit message exactly in this shape. Do not deviate.

```
<type>(<scope>): <imperative summary>

- <specific change>

Closes #<issue_id>
```

Allowed `type` values: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`, `revert`.

`scope` rules:
- Prefer the domain or package name, such as `orders`, `auth`, `api`, `ui`, `db`, `bot`, or `ci`.
- Omit the scope only when no concise, accurate scope exists.
- Keep the subject under 72 characters when practical.
- Use an imperative verb: `add`, `fix`, `validate`, `remove`, `rename`.

Examples:

```text
feat(bot): add strategy validation

- Validate strategy input before execution
- Add regression tests for invalid strategy payloads

Closes #42
```

```text
fix(auth): handle expired refresh tokens

- Return a typed unauthorized response for expired tokens
- Cover refresh-token expiry in service tests

Closes #51
```

Stage and commit:

```bash
git add .
git commit -m "$(cat <<'EOF'
feat(scope): add strategy validation

- Validate strategy input before execution
- Add regression tests for invalid strategy payloads

Closes #42
EOF
)"
```

### 5.2 Build the PR/MR title

Use exactly this format:

```
[Issue #<issue_id>] <issue title>
```

Example:

```text
[Issue #42] Implement trading bot strategy validation
```

### 5.3 Build the PR/MR body

Write the body exactly in this Markdown shape. Fill every section. Do not omit sections.

```markdown
## Summary
<One or two sentences describing the completed outcome.>

## Issue
Closes #<issue_id>

## Changes
- <User-visible or architectural change>
- <Test, migration, dependency, or documentation change>

## Validation
- [x] `<command>`: <result>
- [x] `<command>`: <result>
- [x] Documentation updated or not required

## Risk And Rollback
- Risk: <low/medium/high plus the concrete reason>
- Rollback: Revert this PR/MR, or <specific rollback step>

## Notes
<Optional. Include migration notes, reviewer context, or known limitations. Use "None" when there is no useful note.>
```

Validation examples:

```markdown
- [x] `bun test`: passed
- [x] `bun run typecheck`: passed
- [x] `npm run lint`: passed
```

If a validation command cannot run, keep the checkbox unchecked and state the reason:

```markdown
- [ ] `bun test`: not run, missing local database service
```

### 5.4 Create the PR/MR

#### GitHub

```bash
git push -u origin feature/42-short-description
gh pr create --repo owner/repo --title "[Issue #42] Implement trading bot strategy validation" --body "$(cat <<'EOF'
## Summary
<text>

## Issue
Closes #42

## Changes
- <text>
- <text>

## Validation
- [x] `<command>`: <result>
- [x] `<command>`: <result>
- [x] Documentation updated or not required

## Risk And Rollback
- Risk: <text>
- Rollback: <text>

## Notes
<text>
EOF
)"
```

#### GitLab

```bash
git push -u origin feature/42-short-description
glab mr create --project-id <id> --title "[Issue #42] Implement trading bot strategy validation" --description "$(cat <<'EOF'
## Summary
<text>

## Issue
Closes #42

## Changes
- <text>
- <text>

## Validation
- [x] `<command>`: <result>
- [x] `<command>`: <result>
- [x] Documentation updated or not required

## Risk And Rollback
- Risk: <text>
- Rollback: <text>

## Notes
<text>
EOF
)"
```

Add labels: `status:under-review` and the relevant type label if they exist in the repo.

## 6. Validate And Iterate

### 6.1 Push commits and create the PR/MR

Push the local commits to the remote branch, then create the PR/MR for this issue.

### 6.2 Verify the PR/MR is correct

Check all of the following:

1. PR size:

```bash
git diff main..HEAD --stat
```

If added lines exceed `pr_size_block_loc` (default 500), stop and report the PR/MR URL with a request for human approval. If added lines exceed `pr_size_warning_loc` (default 300), note the warning in the PR description.

2. CI/CD status.

### GitHub

```bash
gh pr checks <pr-id> --repo owner/repo
```

Poll every 1s, 2s, 4s, 8s with max 60s interval, up to `ci_poll_timeout_minutes` from config.

### GitLab

```bash
glab mr view <mr-id> --project-id <id> --json pipelines
```

Poll the pipeline status with the same backoff.

3. Required reviews are satisfied (if `code_review_required` is true).
4. No known security issues (run the security scan in step 4 again if needed).
5. No untracked dependency or documentation gaps.

### 6.3 If the PR/MR is correct

Merge the PR/MR into the main branch, close the issue, delete the feature branch, and move the project item to done.

#### GitHub merge and cleanup

```bash
gh pr merge <pr-id> --repo owner/repo --squash --delete-branch
gh issue close <issue-id> --repo owner/repo
```

#### GitLab merge and cleanup

```bash
glab mr merge <mr-id> --project-id <id> --squash --delete-branch
glab issue close <iid> --project-id <id>
```

If autonomous merge is not configured, stop here and report the PR/MR URL with instructions for the human to merge.

### 6.4 If the PR/MR is incorrect or CI/review fails

1. Comment on the issue with the failure summary.
2. Fix the branch: edit code, add/update tests, run validation commands.
3. Commit the fix:

```bash
git add .
git commit -m "fix(scope): describe the fix

- Specific change 1
- Specific change 2

Closes #<issue_id>"
```

4. Push the updated branch:

```bash
git push origin feature/<id>-<short-description>
```

5. Re-verify the PR/MR by repeating step 6.2.
6. If the PR/MR passes on re-verification, repeat step 6.3.
7. If the PR/MR still fails after the fix, and human approval is required, stop after reporting the PR/MR URL, current checks, and requested reviewers.

## Output

Report final status using: **DONE**, **DONE_WITH_CONCERNS**, **BLOCKED**, or **NEEDS_CONTEXT**.

Include:
- Issue number and title
- Branch name
- PR/MR URL
- Validation result (passed / failed / pending human)
- Files changed
- Commands run
- Any remaining human action
