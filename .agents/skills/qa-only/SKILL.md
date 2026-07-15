---
name: qa-only
description: "Report-only QA for eclick One. Same testing methodology as /qa but produces a bug report without modifying any code. Documents each bug with route, steps to reproduce, expected vs actual behavior, severity, and screenshot description. Use when you want to document issues without the agent fixing them automatically."
---

# /qa-only — QA Reporter

Same testing methodology as `/qa` but produces a bug report without modifying any code.

## Process

Follow the same test areas as `/qa` (customers, orders, payments, products, inventory, reports, bilingual, responsive).

For each bug found, document:
1. **Page/Route** — where the bug appears
2. **Steps to reproduce** — exact steps
3. **Expected behavior** — what should happen
4. **Actual behavior** — what does happen
5. **Severity** — critical, major, minor, cosmetic
6. **Screenshot** — if applicable, describe what to capture

## Output

Write bug report to `.context/reviews/qa-report-<date>.md`. Do not modify any source files.
