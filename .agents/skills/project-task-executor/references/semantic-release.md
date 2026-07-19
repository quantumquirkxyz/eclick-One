# Semantic Release Reference

## Purpose

Integrate automated semantic versioning and changelog generation after merge so releases stay in sync with delivered issues.

## Configuration

When `semantic_release.enabled` is true:

- `provider`: the platform hosting the repository (`github` or `gitlab`).
- `ci_command`: the command that triggers the release pipeline (e.g., `npm run release`, `semantic-release`).
- `verify_changelog`: if true, verify that the generated changelog contains an entry for this issue before marking the issue as done.

## Workflow

1. After merge, run the release command:

```bash
# GitHub Actions or CI
npm run release
# or
semantic-release
```

2. If the command succeeds, verify the release:
   - Check that a new tag was created.
   - Check that the changelog was updated.
   - If `verify_changelog` is true, grep the changelog for the issue number or title.

3. If the release command fails:
   - Do not mark the issue as done.
   - Report BLOCKED with the release error.
   - Keep the branch and PR available for manual release fixes.

## Conventional Commits Mapping

Ensure commit messages use the correct type so semantic-release infers the right version bump:

| Commit type | Version bump | Example |
|-------------|--------------|---------|
| `feat` | minor | `feat(api): add order cancellation endpoint` |
| `fix` | patch | `fix(auth): handle expired refresh tokens` |
| `perf` | patch | `perf(db): add index on orders.created_at` |
| `docs` | none | `docs: update API reference` |
| `refactor` | none | `refactor: extract validation logic` |
| `test` | none | `test: add regression test for timeout` |
| `build` / `ci` / `chore` | none | `chore: upgrade dependencies` |

Breaking changes must use `!` or the `breaking-change` label: `feat(api)!: change order status enum`.

## Post-Release

If the release succeeds, comment on the issue:

```markdown
Released in <version>.

Changelog: <changelog_url>
Tag: <tag_url>
```

Close the issue and delete the branch as usual.
