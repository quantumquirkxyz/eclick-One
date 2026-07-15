---
name: ship
description: "Release engineering. Runs typecheck and tests, invokes /review if not already done, audits coverage, commits, pushes, and opens a PR on GitHub. Bootstraps test framework if none exists. Use when ready to land changes to the main branch."
---

# /ship — Release Engineering

Prepare the current branch for shipping.

## Process

### Step 1: Sync with Main
```bash
git fetch origin main
git merge-base --is-ancestor origin/main HEAD || echo "Branch is behind main"
```

### Step 2: Typecheck
```bash
bun run typecheck
```
Fix any type errors.

### Step 3: Run Tests
```bash
bun test
```
Fix any failing tests. Add tests for new code if coverage is insufficient.

### Step 4: Run Review
Invoke `/review` if not already done on this branch.

### Step 5: Coverage Audit
Check that new code has tests. Flag untested code paths.

### Step 6: Final Checks
- `.env.example` updated if new env vars added
- README updated if behavior changed
- Translation keys exist in both EN and ES

### Step 7: Commit and Push
```bash
git add -A
git commit -m "feat: description of what shipped"
git push origin HEAD
```

### Step 8: Open PR
```bash
gh pr create --title "<title>" --body "<description>" --base main
```

## Output
PR URL and summary of what shipped.
