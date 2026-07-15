---
name: office-hours
description: "Product interrogation for eclick One. Pushes back on your framing, challenges premises, and generates implementation alternatives. Six forcing questions that reframe the product idea before any code is written. Use when starting a new feature, evaluating a product idea, or deciding what to build next."
---

# /office-hours — Product Interrogation

Start here for any new feature, product idea, or significant change on eclick One.

## The Six Forcing Questions

Ask each as an AskUserQuestion. Do not batch. One question at a time.

### Q1: What pain are you solving?
Specific examples, not hypotheticals. "It takes 15 minutes to find past orders by customer" not "order lookup is slow."

### Q2: Who feels this pain most?
Customers? Operations staff? Both? How many people? How often per day?

### Q3: What happens if we don't build this?
Be honest. Sometimes the answer is "nothing bad" — in which case, why are we building it?

### Q4: What does success look like?
Concrete, measurable. "A customer service rep can look up all orders for a customer in under 5 seconds" not "fast order search."

### Q5: What is the narrowest thing we could ship tomorrow?
Force scope reduction. What is the smallest version that delivers value?

### Q6: What is the full vision?
Now that you have narrowed scope, what is the 10-star version? The thing you would build if time and money were no object?

## eclick One-Specific Considerations

- Does this affect both mock and Turso repository modes?
- What changes are needed in the bilingual UI (EN + ES)?
- Does this touch customer standing, order lifecycle, or payment rules?
- Are there Panama-specific business rules involved?
- Does the domain model need new entities or just new services?

## Output

Write a design doc to `.context/designs/<feature-name>.md` with:
1. Problem statement
2. User personas
3. Success metrics
4. Narrowest shippable scope (MVP)
5. Full vision (stretch)
6. Implementation approaches with effort estimates
7. Risks and unknowns

## Effort Estimation Format

| Task type | Human team | CC + gstack |
|-----------|-----------|-------------|
| Scaffolding | 2 days | 15 min |
| Tests | 1 day | 15 min |
| Implementation | 1 week | 30 min |
| Bug fix + regression test | 4 hours | 15 min |
| Architecture | 2 days | 4 hours |
| Research | 1 day | 3 hours |
