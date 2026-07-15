---
name: codex
description: "Second opinion code review. Three modes: Review (pass/fail gate), Adversarial Challenge (actively find problems), Open Consultation (free-form analysis). Compares findings with any prior /review output. Use for complex or risky changes where an independent perspective adds confidence."
---

# /codex — Second Opinion

Get an independent review from a secondary perspective.

## Modes

Ask the user which mode:

- **A) Review** — pass/fail gate on the current branch. "Would you ship this?"
- **B) Adversarial Challenge** — "Convince me this is wrong." Actively try to find problems.
- **C) Open Consultation** — "What are your thoughts?" Free-form analysis.

## Process

1. Load relevant rules: `.agents/rules/architecture.md`, `.agents/rules/quality-standards.md`
2. Read the diff: `git diff $(git merge-base HEAD main)`
3. Provide an independent assessment
4. Compare with any prior review from `/review`:
   - Where do they agree? (High confidence findings)
   - Where do they disagree? (Flag for user decision)
   - What did one catch that the other missed?

## Output

Write to `.context/reviews/codex-<branch>.md`. Include assessment, agreement/disagreement with prior review, and recommended next steps.
