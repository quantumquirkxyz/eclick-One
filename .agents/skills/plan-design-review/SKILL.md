---
name: plan-design-review
description: "Design dimension review for eclick One. Rates each design dimension (clarity, efficiency, feedback, consistency, bilingual, error states, empty states, mobile, loading, accessibility) from 0-10. Explains what a 10 looks like for each. One AskUserQuestion per dimension. Use before building UI features."
---

# /plan-design-review — Design Review

Read the design doc and CEO review. Rate each dimension 0-10. One dimension per AskUserQuestion.

## Design Dimensions

| Dimension | What a 10 looks like |
|-----------|---------------------|
| **Clarity** | User knows exactly what this is, what to do, and what will happen next |
| **Efficiency** | Common tasks are 2-3 clicks, not 5+. No unnecessary steps |
| **Feedback** | Every action shows result: loading spinner, success toast, error message |
| **Consistency** | Same patterns as rest of app: same buttons, layouts, terminology |
| **Bilingual** | EN and ES both read naturally. No truncated translations. No hardcoded English |
| **Error states** | Error message tells user what happened AND what to do. Retry button present |
| **Empty states** | No data? Show helpful message + call to action, not a blank page |
| **Mobile** | Works on phone. Touch targets >= 44px. No horizontal scroll |
| **Loading** | Skeleton screens or spinners. Not just "Loading..." text |
| **Accessibility** | Labels, aria attributes, keyboard navigation, color contrast |

## Output

Write the design review to `.context/reviews/design-<feature-name>.md` with final scores and changes agreed with the user. Then call ExitPlanMode.
