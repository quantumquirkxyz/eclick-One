# Git Workflow Rules

## Branch Strategy

- `main` — stable, deployable at all times
- Feature branches: `feature/<id>-<slug>`
- Bug fix branches: `fix/<id>-<slug>`
- Chore branches: `chore/<short-description>`

## Commit Messages

```
feat: add customer order history endpoint
fix: prevent order cancellation after delivery
chore: update dependencies
docs: add API reference for payments
refactor: extract order validation logic
test: add regression test for customer standing check
```

## PR Checklist

Before opening a PR:
- [ ] Typecheck passes
- [ ] Tests pass
- [ ] New code has tests
- [ ] `.env.example` updated if new env vars added
- [ ] Translations added if applicable
- [ ] Error/loading/empty states implemented
- [ ] Works in both mock and SQL modes (when both apply)

## Code Review Standards

- Every PR needs at least one review before merging
- Review the diff, not just the summary
- Check for: type safety, error handling, bilingual support, mock/SQL parity, domain isolation
