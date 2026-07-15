---
name: retro
description: "Engineering retrospective. Analyzes git history from the past 7 days to understand what shipped, what broke, and what can improve. Produces a report with per-person breakdowns, shipping streaks, test health trends, and growth opportunities. Use weekly to track progress and identify improvement areas."
---

# /retro — Engineering Retrospective

Analyze git history to understand what shipped, what broke, and how the team can improve.

## Process

### 1. Gather Data
```bash
git log --oneline --since="7 days ago" --no-merges
git shortlog -sn --since="7 days ago" --no-merges
bun test 2>/dev/null && echo "Tests passing" || echo "Tests failing"
```

### 2. Analyze
- What shipped? (features, fixes, chores)
- What broke? (bugs found, reverts needed)
- Test health (passing/flaky/broken)
- Code review quality (issues caught vs issues that shipped)

### 3. Write Retrospective
Write to `.context/retros/<date>.md`:
- **Shipped** — what landed
- **Strengths** — what went well
- **Weaknesses** — what could improve
- **Growth opportunities** — specific actionable items
- **Test health** — coverage trends, flaky tests, gaps

### 4. Recommend
What should the team focus on this week? One or two specific, actionable items.
