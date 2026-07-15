---
name: autoplan
description: "One-command full review pipeline for eclick One. Runs CEO → design → eng reviews automatically with encoded decision principles. Surfaces only taste decisions for user approval. Use for any significant feature to get a fully reviewed, consolidated plan in one command."
---

# /autoplan — Automated Review Pipeline

One command, fully reviewed plan. Runs CEO → design → eng reviews automatically.

## Process

1. Read the design doc from `.context/designs/` or the user's description
2. Ask "What mode: Expansion, Selective Expansion, Hold Scope, or Reduction?"
3. Run CEO review (strategy + scope) using the plan-ceo-review methodology
4. Run design review (UI/UX dimensions) using the plan-design-review methodology
5. Run eng review (architecture + data flow + tests) using the plan-eng-review methodology
6. Output a consolidated plan

## Decision Principles

- When CEO and design disagree about scope: default to CEO, flag the tension
- When design and eng disagree about feasibility: default to eng, flag the tension
- When all three agree: proceed with confidence
- When all three disagree: stop and ask the user

## Output

Write one consolidated plan to `.context/plans/<feature-name>.md` with:
- Executive summary (CEO verdict)
- Design decisions and scores
- Architecture and data flow diagrams
- File-by-file implementation plan
- Test matrix
- Risk register

Then call ExitPlanMode.
