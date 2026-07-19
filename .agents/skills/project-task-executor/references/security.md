# Security Reference

## When To Scan

Before every commit, inspect outgoing changes for common secret patterns and accidental `.env` additions.

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

## Handling Accidental Secret Commits

1. **Rotate the secret immediately.** Assume any committed secret is compromised. Revoke or regenerate the token/key through the provider console.
2. **Rewrite history** if the secret was pushed to a shared branch. Use `git rebase` or the provider's history-rewrite tool to purge the secret from all commits.
3. **Notify the admin** if the secret grants access to production resources, third-party services, or other teams. Provide the commit hash, affected files, and remediation steps.
4. **Verify cleanup** by re-inspecting the rewritten or force-pushed history.

## Token Environment Variable Conventions

| Variable | Provider | Usage |
|----------|----------|-------|
| `GITHUB_TOKEN` | GitHub | API and `gh` CLI fallback |
| `GITLAB_TOKEN` | GitLab | API and `glab` CLI fallback |
| `GIT_TOKEN` | Generic | Fallback when provider-specific token is unavailable |

Never hardcode tokens in source files, config files, or commit messages. Prefer authenticated CLIs (`gh`, `glab`) over raw environment variables when both are available.
