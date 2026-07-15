---
name: review
description: "Pre-landing PR review for eclick One. Reviews every changed file for type safety, error handling, edge cases, mock/Turso parity, bilingual support, and domain isolation. Auto-fixes obvious issues. Flags completeness gaps. Use before every /ship to catch bugs that pass CI but break in production."
---

# /review — Code Review

Review all changes on the current branch against the base branch.

## Process

### 1. Scope
```bash
git diff --stat $(git merge-base HEAD main)
```

### 2. Review Each File
For each changed file, check:

- **Type safety** — any `any`, type assertions, or unchecked casts?
- **Error handling** — every error path handled? No empty catches?
- **Edge cases** — empty arrays, null values, undefined, boundary conditions?
- **Mock/Turso parity** — does the change work in both modes?
- **Bilingual** — are new UI strings in both EN and ES?
- **Domain isolation** — does `packages/domain/` import anything outside domain?
- **Repository contract** — do service tests pass with both mock and Turso adapters?

### 3. Auto-Fix Threshold
Fix these automatically:
- Missing error handling
- Missing types
- Mock/Turso mode divergence
- Missing translations
- Linting issues

Ask before fixing:
- Architecture changes (moving code between layers)
- Interface/contract changes (changing repository or service signatures)
- Adding new dependencies

### 4. Regression Tests
For every fix, write or update a regression test.

### 5. Output
Write review to `.context/reviews/review-<branch>.md` with:
- Files reviewed
- Auto-fixed issues
- Issues requiring user decision
- Remaining concerns
- Recommendation: ship, ship after fixes, needs re-review
