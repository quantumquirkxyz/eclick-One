---
name: careful
description: "Safety guardrails. Warns before executing destructive commands: rm -rf, DROP TABLE, force-push, reset --hard, branch -D, and any command that modifies .env or credentials. Activate by saying 'be careful' or typing /careful."
---

# /careful — Safety Guardrails

Warns before executing destructive commands.

## Guarded Commands

Before running any of these, print a warning and ask for confirmation:
- `rm -rf` (especially with force flags)
- `DROP TABLE`, `DROP DATABASE`, `DELETE FROM` without `WHERE`
- `git push --force`, `git reset --hard`, `git branch -D`
- Any command that modifies `.env` or credentials
- Any command that deletes files outside the working directory

## Special Protection for Database Commands

Before running any SQL command against a database:
1. Confirm the target is NOT production
2. Confirm the user intends to modify data
3. Suggest running against mock mode first

## How to Activate
Say "be careful" or type `/careful` during any session. Override any warning by saying "I am sure" or "proceed anyway."
