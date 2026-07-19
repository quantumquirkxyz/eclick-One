# PR, Comment, And Commit Formats

Use these formats for repository-facing artifacts unless the repository already has stricter templates. Keep text concise, factual, and in English. Do not paste secrets or full CI logs; include links and the smallest useful excerpt.

## Commit Format

Use Conventional Commits:

```text
<type>(<scope>): <imperative summary>

- <specific change>
- <specific validation or follow-up, if useful>

Closes #<issue_id>
```

Allowed common types:

- `feat`: new user-facing behavior or capability.
- `fix`: bug fix.
- `docs`: documentation-only change.
- `test`: test-only change.
- `refactor`: internal restructuring without behavior change.
- `perf`: performance improvement.
- `build`: dependency, packaging, or build-system change.
- `ci`: CI/CD workflow change.
- `chore`: maintenance with no product behavior change.
- `revert`: revert a previous commit.

Scope rules:

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

## PR/MR Format

Title:

```text
[Issue #<issue_id>] <issue title>
```

Body:

```markdown
## Summary
<One or two sentences describing the completed outcome.>

## Issue
Closes #<issue_id>

## Changes
- <User-visible or architectural change>
- <Test, migration, dependency, or documentation change>

## Validation
- [x] <command>: <result>
- [x] <command>: <result>
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

## Issue Comments

### Start Work

Post when moving an issue to in-progress:

```markdown
Starting implementation on branch `<branch-name>`.

Plan:
- <implementation step>
- <test/validation step>
```

### Clarification Needed

Post when acceptance criteria are ambiguous:

```markdown
I need clarification before implementation can continue.

Question:
- <specific blocking question>

Current interpretation:
- <what will be built if confirmed>
```

### Validation Failed

Post on the issue when a PR/MR fails validation:

```markdown
PR/MR <pr_url> failed validation.

Failures:
- <failure type>: <short message>
- <failure type>: <short message>

Suggested fixes:
- <next action>
- <next action>
```

### Blocked

Post when external access, credentials, dependency state, or a required human decision blocks progress:

```markdown
Blocked on <blocker category>.

Details:
- <specific blocker>
- <attempted command or API action, with secrets removed>

Needed next:
- <specific action owner and required input>
```

### Completed

Post after merge or accepted completion:

```markdown
Completed via <pr_url>.

Validation:
- <command/check>: passed
- <command/check>: passed
```

## PR/MR Comments

### Ready For Review

```markdown
Ready for review.

Summary:
- <change>
- <test coverage>

Validation:
- <command/check>: passed
```

### CI Failure Follow-Up

```markdown
CI failed on <check name>.

Relevant failure:
- <short sanitized error>

Action:
- <fix being applied or reason it needs human input>

Logs: <logs_url>
```

### Review Feedback Addressed

```markdown
Addressed review feedback.

Changes:
- <feedback item fixed>
- <test or validation added>

Validation:
- <command/check>: passed
```

## Validation Rejection JSON

When a machine-readable report is useful, emit this JSON shape in the local summary or issue comment:

```json
{
  "pr_id": 123,
  "status": "rejected",
  "errors": [
    {
      "type": "CI/CD Failure",
      "message": "Tests failed in GitHub Actions.",
      "logs_url": "https://github.com/org/repo/actions/runs/123456"
    }
  ],
  "suggestions": [
    "Fix the failing test and push an update to the same branch."
  ]
}
```
