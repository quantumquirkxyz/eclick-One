---
name: plan-ceo-review
description: "CEO-level strategic review. Reads the design doc and runs a 10-section strategic review across four scope modes: Expansion, Selective Expansion, Hold Scope, or Reduction. Each finding is a separate AskUserQuestion. Use after /office-hours and before implementation."
---

# /plan-ceo-review — Strategic Product Review

Read the design doc (from `/office-hours`) or the feature request. Then run a 10-section review.

## Four Scope Modes

Ask the user which mode:

- **A) Expansion** — "What if we solved the bigger problem?" Default for new features.
- **B) Selective Expansion** — Expand some parts, hold others. Default for existing features.
- **C) Hold Scope** — Review as-is, reject scope creep. Default for ship-critical items.
- **D) Reduction** — Aggressively cut. Default for overdue items.

## 10-Section Review

One section at a time. Each finding = one AskUserQuestion. Never batch findings.

1. **Problem** — Is this the real problem? What problem does this actually solve?
2. **User** — Who benefits? Are there non-obvious users?
3. **Value** — What is the impact? How do we measure success?
4. **Scope** — Is this the right scope? What is excluded that should not be?
5. **Risks** — What could go wrong? Technical, business, UX risks.
6. **Alternatives** — What else did we consider? Why reject those?
7. **Dependencies** — What must exist first? What depends on this?
8. **Timing** — Why now? What changes if we wait 3 months?
9. **Team** — Who needs to be involved? What skills are needed?
10. **Verdict** — Ship as-is, ship with changes, reconsider, or kill.

## Project Considerations

- Does this affect both mock and SQL repository modes?
- What changes are needed in the bilingual UI (EN + ES)?
- Does this touch customer standing, order lifecycle, or payment rules?
- Are there domain-specific business rules involved?
- Does the domain model need new entities or just new services?
- How does monthlyRuleApplies factor in?

## Output

Write the review to `.context/reviews/ceo-<feature-name>.md` with mode chosen, each section's findings and responses, final verdict, and recommended next step. Then call ExitPlanMode.
