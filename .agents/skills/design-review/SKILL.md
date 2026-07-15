---
name: design-review
description: "Live visual audit. Visits every route in the running app, checks layout, typography, colors, bilingual rendering, responsive behavior, and state management. Finds issues and fixes them with atomic commits. Each fix includes before/after screenshots. Use before shipping any UI change."
---

# /design-review — Visual Design Audit

Audit the live frontend, find visual issues, fix them with atomic commits.

## Process

### 1. Start the App
```bash
bun run dev
```

### 2. Check Each Route
Visit each route in `/app/*` and verify:

- **Layout** — Does everything fit? No overlapping elements? Proper spacing?
- **Typography** — Font sizes consistent? Line heights readable?
- **Colors** — Correct palette? Sufficient contrast?
- **Bilingual** — Switch to ES. Do all labels fit? No truncated text?
- **States** — Loading, empty, error, retry for each data-dependent view
- **Responsive** — Resize the browser. Does it work at mobile widths?
- **Navigation** — Can you reach every page? Active states correct?
- **Forms** — Labels, validation messages, submit button states

### 3. Each Fix = One Atomic Commit
Fix the issue, commit with a clear message. Run typecheck before committing.

### 4. Before/After Screenshots
For each fix, describe the before and after state. The primary developer can capture screenshots.

## Output

Write audit to `.context/reviews/design-audit-<date>.md`. List: pages reviewed, issues found, fixes applied, remaining issues.
