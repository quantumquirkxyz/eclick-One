---
name: project-task-executor
description: "Autonomous project-board task execution for GitHub/GitLab repositories. Use when the user invokes /project-task-executor [repo_url] [project_id] or asks Codex to scan a project board, pick ready issues by priority, implement them, commit with Conventional Commits, open and validate PRs/MRs, and update issue/project status."
---

# /project-task-executor

Execute ready project-board issues from discovery through validated PR/MR, one issue at a time.

## Inputs

- Accept `/project-task-executor [repo_url] [project_id]`.
- If an argument is omitted, read `.project-task-executor-config.json` from the repository root.
- Read [references/config.md](references/config.md) when creating or repairing executor configuration.
- Read `.agents/agents/project-task-executor.md` before assigning responsibilities across scanner, prioritizer, implementer, git manager, validator, and updater phases.
- Read `.agents/rules/project-task-executor.md` before executing Git, API, project-board, validation, merge, or recovery actions.
- Read [references/formats.md](references/formats.md) before writing PR/MR descriptions, issue comments, review comments, validation reports, or commit messages.

## Workflow

### 1. Prepare

1. Load existing `.skill-state.json` if present and resume the recorded issue/branch/PR when it is still valid.
2. Clone `repo_url` only when the target repository is not already present locally.
3. Fetch the default branch and determine whether it is `main`, `master`, or the configured branch.
4. Verify API access with the available toolchain: GitHub app/MCP, `gh`, GitLab app/MCP, `glab`, or direct API calls.

### 2. Scan

Fetch project-board issues with pagination. Include only issues that:

- are open,
- have `status:ready-to-start`,
- have one of `priority:high`, `priority:medium`, or `priority:low`,
- do not have `blocked`, `wontfix`, or `duplicate`.

Normalize each issue to:

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

Capture dependencies from linked issues, explicit project metadata, or issue-body dependency checklists when the platform exposes them. Apply scanner rules from `.agents/rules/project-task-executor.md`.

### 3. Prioritize

Run the deterministic prioritizer when you have normalized issue JSON:

```bash
python3 .agents/skills/project-task-executor/scripts/prioritize_issues.py issues.json --output prioritized-issues.json
```

The selected issue is the first item after sorting by dependency order, priority, then creation date.

### 4. Implement

1. Move the issue to in-progress using the updater rules.
2. Create the issue branch using the git manager rules.
3. Read the issue, relevant code, tests, package scripts, lint/typecheck settings, and repository docs before editing.
4. Implement the smallest production-quality change that satisfies the issue.
5. Add or update focused tests for changed behavior.
6. Run the relevant validation commands discovered from the repository.

### 5. Commit And Open PR/MR

Use the commit, PR/MR, and comment formats from [references/formats.md](references/formats.md). Repository-facing artifacts are written in English unless the repository's existing convention clearly uses another language.

Commit and open the PR/MR through the git manager agent contract.

### 6. Validate And Iterate

1. Validate the PR/MR through the validator agent contract.
2. If validation fails, apply the rejection and recovery rules, then iterate.
3. If validation passes, update project status through the updater agent contract.

## Output

During execution, report concise progress lines for each agent phase. Final output should include the issue number, branch, PR/MR URL, validation result, changed files, commands run, and any remaining human action.
