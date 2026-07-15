# Git Workflow Rules

## Branch Strategy

- `main` — stable, deployable at all times
- Feature branches: `feat/<short-description>`
- Bug fix branches: `fix/<short-description>`
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
- [ ] `bun run typecheck` passes
- [ ] `bun test` passes
- [ ] New code has tests
- [ ] `.env.example` updated if new env vars added
- [ ] Both EN and ES translations added for new UI strings
- [ ] Error/loading/empty states implemented
- [ ] Works in `REPOSITORY_MODE=mock` and `turso` (when both apply)

## Code Review Standards

- Every PR needs at least one review before merging
- Review the diff, not just the summary
- Check for: type safety, error handling, bilingual support, mock/Turso parity, domain isolation
