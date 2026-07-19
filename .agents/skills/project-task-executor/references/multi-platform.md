# Multi-Platform Reference

## Purpose

Synchronize issue tracking, PR/MR creation, and validation across mirrored GitHub and GitLab repositories.

## Configuration

When `multi_platform.enabled` is true, the agent operates on all platforms listed in `multi_platform.mirror_platforms` (default: `["github", "gitlab"]`).

## Synchronized Scanning

1. Fetch issues from all configured platforms using their respective CLIs (`gh`, `glab`).
2. Normalize issues to the shared JSON schema in `SKILL.md`.
3. Deduplicate by cross-referencing issue titles and bodies. If an issue exists on both platforms, treat them as the same work item and pick the platform with the lower issue ID as canonical.
4. If `multi_platform.sync_issues` is true, post a cross-link comment on both platforms:

```markdown
Mirrored from <platform>: <issue_url>
```

## Synchronized PR/MR Creation

1. Implement on a single local branch as usual.
2. Push once.
3. Create the PR on every configured platform:

```bash
# GitHub
gh pr create --repo owner/repo --title "..." --body "..."
# GitLab
glab mr create --project-id <id> --title "..." --description "..."
```

4. If `multi_platform.sync_labels` is true, apply the same labels to every PR/MR.
5. If `multi_platform.sync_issues` is true, update the issue body on every platform with links to all PRs/MRs.

## Synchronized Validation

1. Poll CI/CD on every platform using the backoff rules in `SKILL.md` section 6.
2. If any platform's CI fails, treat the entire change as failing.
3. If platforms have divergent review policies, require approval from the strictest policy.

## Synchronized Merge

1. Merge on the platform designated as primary (default: GitHub).
2. If `squash` is configured, squash on merge.
3. Delete the branch after merge.
4. If the branch does not auto-delete on a mirror platform, delete it manually.
