---
name: land-and-deploy
description: "Merge and deploy for eclick One. Merges an approved PR (squash + delete branch), then verifies the deploy is healthy by checking the health endpoint and running a quick smoke test. Use after a PR has been approved and is ready to land."
---

# /land-and-deploy — Merge and Deploy

Merge an approved PR, verify the deploy is healthy.

## Process

### Step 1: Verify CI
Check that CI passes on the PR.

### Step 2: Merge
```bash
gh pr merge --squash --delete-branch
```

### Step 3: Verify
- Hit the health endpoint
- Verify the app loads
- Run a quick smoke test of core flows

### Step 4: Clean Up
```bash
git fetch origin main
git checkout main
git pull
```

## Output
Write deploy report to `.context/deploys/<date>.md`: PR merged, verification results, any issues.
