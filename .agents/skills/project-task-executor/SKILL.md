---
name: project-task-executor
description: "IMMEDIATE EXECUTION on skill invocation. Scans GitHub/GitLab project board, picks the highest-priority ready issue by dependency order and priority, implements it with focused tests, commits with Conventional Commits, opens a validated PR/MR, updates project status, and reports the outcome. Do not describe — execute."
---

## Immediate Execution

Execute the full workflow now. Do not ask for confirmation. Do not describe the plan — run it.

## 1. Prepare

### 1.1 Configuration resolution (no config file required)

Resolve configuration in this order, first match wins:

1. **Environment variables**: check `PROJECT_TASK_REPO_URL`, `PROJECT_TASK_PROJECT_ID`, `PROJECT_TASK_MAIN_BRANCH`, `PROJECT_TASK_GIT_TOKEN_ENV`, `PROJECT_TASK_PLATFORM`, `PROJECT_TASK_AUTONOMOUS_MERGE`, `PROJECT_TASK_CODE_REVIEW_REQUIRED`, `PROJECT_TASK_CI_REQUIRED`.
2. **Repository conventions**: infer from `git remote`, `git symbolic-ref`, `package.json`, `foundry.toml`, CI config, and existing issue labels.
3. **Optional config file**: if `.project-task-executor-config.json` exists in the repo root, read it. It overrides defaults but not environment variables.
4. **Defaults**: use the values documented in `references/config.md`.

Do not fail if no config file exists. Proceed with inferred or default values.

### 1.2 Recovery-first state loading

Load `.skill-state.json` if present. If the recorded issue/branch/PR is still valid, resume from that state using the `recovery_zone` fields. If the state was interrupted mid-phase, restore the `partial_diff` and `checkpoint_files` before resuming implementation.

### 1.3 Repository setup

1. If the target repo is not already present locally, clone it.
2. Fetch the default branch. Determine if it is `main`, `master`, or the configured branch.
3. Verify API access: run `gh auth status`. If it fails, run `glab auth status`. If both fail, check for `GITHUB_TOKEN`, `GITLAB_TOKEN`, or `GIT_TOKEN` environment variables. If none work, report BLOCKED.

### 1.4 Lazy context loading

Load references only when the current phase requires them:

- **Phases 1-2** (prepare/scan/prioritize): `SKILL.md` sections 1-3 + `references/config.md` labels and main_branch
- **Phase 4** (implement): add `references/monorepo.md` and `references/quality-standards.md` from `.agents/rules/`
- **Phase 5** (commit/PR): add `references/formats.md`
- **Phase 6** (validate): add `references/security.md`, `references/quality-gates.md`, `references/test-intelligence.md`
- **Orchestration hooks**: add agent definitions from `.agents/agents/project-task-executor.md`

Do not load all six mandatory files at once. Load only what the phase needs to preserve context budget.

## 2. Scan

Fetch all open project-board issues with pagination. Keep only issues that:
- are **open**
- have label `status:ready-to-start`
- have one of `priority:high`, `priority:medium`, or `priority:low`
- do **not** have `blocked`, `wontfix`, or `duplicate`

### 2.1 Dependency intelligence

Beyond body checklists, extract dependencies from:

1. **Linked issues**: parse `Closes #N`, `Depends on #N`, `Part of #N`, `Related to #N` patterns from body and comments.
2. **Mentions**: if another ready issue mentions the current issue by number, add as implicit dependency.
3. **Implicit dependencies**: if the issue body mentions files, packages, or contracts that overlap with other issues' touched paths, add those issues as soft dependencies.
4. **Graph building**: construct a dependency graph and surface it in the issue comment if cycles or implicit edges are detected.

Save the graph in `dependencies.json` alongside `issues.json`.

### 2.2 GitHub

```bash
gh issue list --repo owner/repo --state open --label "status:ready-to-start" --limit 100
```

Paginate with `--page` until empty. For each issue, fetch details:

```bash
gh issue view <number> --repo owner/repo --json number,title,body,labels,state,createdAt
```

### 2.3 GitLab

```bash
glab issue list --project-id <id> --state opened --label "status:ready-to-start" --per-page 100
```

Paginate with `--page`. For each issue, fetch details:

```bash
glab issue view <iid> --project-id <id> --json iid,title,description,labels,state,createdAt
```

### 2.4 Normalization

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

Capture dependencies from linked issues, project metadata, issue-body dependency checklists, and the dependency intelligence in 2.1. Save all normalized issues to `issues.json` and the dependency graph to `dependencies.json`.

### 2.5 Filter

Exclude issues with:
- `status` not `open`
- missing `status:ready-to-start` label
- missing `priority:high`, `priority:medium`, or `priority:low`
- labels `blocked`, `wontfix`, or `duplicate`

### 2.6 Batch orchestrator

If `batch.enabled` is true in config, instead of selecting one issue, select up to `batch.max_batch_size` issues that:
- have no dependencies among each other
- touch disjoint file paths or packages
- together stay under `batch.batch_issues_max_loc`

Implement all selected issues on a single shared branch: `feature/<id1>-<id2>-batch`. Open one PR/MR with a combined title: `[Batch #42 #43] <short summary>`.

If a single issue's estimated diff exceeds `batch.auto_split_above_loc`, pause and suggest a split plan in the issue comment. If the human approves, create separate issues or branches. If the human overrides, proceed with the single PR and note the exception.

## 3. Prioritize

Sort the filtered issues deterministically:

1. **Dependencies first**: an issue with unresolved dependencies must come after its dependencies. Detect cycles; if a cycle exists, report BLOCKED with the cycle members.
2. **Implicit dependencies**: if two issues touch the same critical path (e.g., same contract, same API endpoint, same DB schema), enforce ordering by issue_id ascending.
3. **Priority descending**: `high` → `medium` → `low`.
4. **Age ascending**: for equal priority, select the oldest `created_at` first.
5. **ID ascending**: if priority and date tie, use lower `issue_id` first.

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

### 4.1 Test intelligence

- **Test impact analysis**: run only tests affected by the changed files/packages, not the entire suite. Use the workspace test command with path filtering when available (e.g., `bun test src/bot/`).
- **Regression test requirement**: if the issue is a bug fix (`fix`), write a test that fails before the fix and passes after. Commit the failing test first, then the fix.
- **Coverage gap analysis**: after running tests, inspect coverage for changed lines. If any new line is uncovered, add or update a test to cover it before committing.

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

### 5.4 Quality gates before PR creation

Before creating the PR/MR, verify:

1. **Coverage delta**: if the change reduces coverage by more than `coverage_delta_block_pct` (default 2%), report BLOCKED.
2. **Breaking change**: if the diff touches public exports, API schemas, or database migrations, require the `breaking-change` label.
3. **Changelog**: if `require_changelog_entry` is true, verify that `CHANGELOG.md` has an entry for this issue.
4. **License compliance**: if new dependencies are added, verify their licenses against the project's approved list.
5. **PR size**: if added lines exceed `pr_size_block_loc` (default 500), stop and report the PR/MR URL with a request for human approval. If added lines exceed `pr_size_warning_loc` (default 300), note the warning in the PR description.

### 5.5 Create the PR/MR

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

### 5.6 Multi-platform simultaneous creation

If `multi_platform.enabled` is true and the repo is mirrored, create the PR/MR on all configured platforms:

```bash
# GitHub
gh pr create --repo owner/repo --title "..." --body "..."
# GitLab
glab mr create --project-id <id> --title "..." --description "..."
```

If `sync_labels` is true, apply the same labels to every platform. If `sync_issues` is true, cross-link the PRs/MRs in the issue body.

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

Poll every 1s, 2s, 4s, 8s with max 60s interval, up to `ci_poll_timeout_minutes` from config. If a test fails with flaky symptoms (non-deterministic output, external service timeout), retry up to `recovery.flaky_test_retries` times before reporting.

### GitLab

```bash
glab mr view <mr-id> --project-id <id> --json pipelines
```

Poll the pipeline status with the same backoff.

3. Required reviews are satisfied (if `code_review_required` is true).
4. No known security issues (run the security scan in step 4 again if needed).
5. No untracked dependency or documentation gaps.
6. **Coverage delta**: if the change reduces coverage by more than `coverage_delta_block_pct`, report BLOCKED.
7. **Breaking change**: if the diff touches public exports, API schemas, or DB migrations, verify the `breaking-change` label exists.
8. **Changelog**: if `require_changelog_entry` is true, verify `CHANGELOG.md` has an entry for this issue.

### 6.3 Skill chaining (orchestration hooks)

After creating the PR/MR and if CI passes:

- **Reviewer**: if `orchestration.invoke_reviewer_after_pr` is true and `code_review_required` is true, invoke `@reviewer` on the PR/MR URL. Wait up to `orchestration.review_timeout_minutes` for review feedback. If feedback arrives, apply it, commit, push, and re-verify.
- **QA**: if `orchestration.invoke_qa_after_ci_pass` is true and the change touches UI or API behavior, invoke `@qa` to run functional validation.
- **Docs**: if `orchestration.invoke_docs_after_merge` is true and the issue has label `type:feature`, invoke `@docs` to update documentation after merge.

### 6.4 Human checkpoint protocol

If `checkpoints.enabled` is true, pause for human approval at configured stages:

- **after_implementation**: before commit, show the diff and ask *"implementation complete, proceed with commit?"*
- **after_pr_creation**: after PR/MR is created, ask *"PR/MR created, authorize merge when CI passes?"*
- **after_ci_pass**: after CI passes but before merge, ask *"CI passed, proceed with merge?"*
- **before_merge**: if `breaking-change` label is present or `pr_size_block_loc` was exceeded, ask *"this change requires extra scrutiny, confirm merge?"*

Report the checkpoint question and wait for human response before proceeding.

### 6.5 Semantic release integration

If `semantic_release.enabled` is true:

1. After merge, run `semantic_release.ci_command` (default: `npm run release` or equivalent).
2. If `semantic_release.verify_changelog` is true, verify that the generated changelog contains an entry for this issue.
3. If the release command fails, report BLOCKED with the release error. Do not mark the issue as done until the release is verified.

### 6.6 Execution memory

After every phase, append an entry to `.execution-log.json`:

```json
{
  "timestamp": "2026-07-18T10:05:00Z",
  "phase": "implement",
  "duration_seconds": 120,
  "outcome": "success",
  "files_changed": 3
}
```

Use this log to:
- Detect slow phases and optimize them in future runs.
- Identify frequently failing areas and suggest additional test coverage.
- Track command success rates.

### 6.7 Automatic merge, cleanup, and issue closure

When CI passes, all required reviews are satisfied, and no quality gates block the PR/MR:

1. **Merge** the PR/MR into the main branch with squash and delete-branch.
2. **Delete the remote branch** if the platform did not auto-delete it.
3. **Close the issue** immediately after merge.
4. **Update project status** to done if the issue belongs to a project board.

This sequence is automatic when `autonomous_merge` is true or when human approval has been granted. Do not stop between merge and issue closure.

#### GitHub merge, cleanup, and issue closure

```bash
gh pr merge <pr-id> --repo owner/repo --squash --delete-branch
git push origin --delete feature/42-short-description 2>/dev/null || true
gh issue close <issue-id> --repo owner/repo
```

Verify deletion:

```bash
git ls-remote --exit-code origin feature/42-short-description 2>/dev/null && echo "branch still exists" || echo "branch deleted"
```

#### GitLab merge, cleanup, and issue closure

```bash
glab mr merge <mr-id> --project-id <id> --squash --delete-branch
git push origin --delete feature/42-short-description 2>/dev/null || true
glab issue close <iid> --project-id <id>
```

Verify deletion:

```bash
git ls-remote --exit-code origin feature/42-short-description 2>/dev/null && echo "branch still exists" || echo "branch deleted"
```

If autonomous merge is not configured, stop after merge and report the PR/MR URL with instructions for the human to close the issue and delete the branch.

### 6.8 Failure recovery

If CI fails or a review requests changes:

1. Comment on the issue with the failure summary.
2. Apply the fix. If the diff is non-trivial, save a checkpoint to `.skill-state.json` `recovery_zone.partial_diff` before re-committing.
3. Run `git rebase main` (or configured default branch) if `recovery.auto_rebase_before_merge` is true and conflicts are trivial. If conflicts are non-trivial, report BLOCKED for human intervention.
4. Commit the fix:

```bash
git add .
git commit -m "fix(scope): describe the fix

- Specific change 1
- Specific change 2

Closes #<issue_id>"
```

5. Push the updated branch:

```bash
git push origin feature/<id>-<short-description>
```

6. Re-verify the PR/MR by repeating step 6.2.
7. If the PR/MR passes on re-verification, repeat step 6.7.
8. If the PR/MR still fails after `recovery.max_attempts_per_issue` attempts, report BLOCKED with the failure history from `.skill-state.json` `recovery_zone.diagnostics` and `.execution-log.json`.

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
