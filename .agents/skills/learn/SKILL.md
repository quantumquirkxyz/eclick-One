---
name: learn
description: "Session memory manager for eclick One. Stores and retrieves patterns, pitfalls, and preferences learned across development sessions. Review, search, prune, and export project-specific learnings. Use to compound knowledge across sessions so the agent gets smarter about the eclick One codebase over time."
---

# /learn — Session Memory

Manage patterns, pitfalls, and preferences learned across development sessions.

## What Gets Stored

- **Project quirks** — non-obvious behaviors of the codebase
- **Pattern preferences** — how the team likes things structured
- **Common pitfalls** — repeated mistakes to avoid
- **Decision history** — why certain architectural choices were made
- **Configuration tricks** — env vars, build flags, workarounds

## Usage

### Store a Learning
When you discover a durable project quirk or fix that would save time next session, document it in `.context/learnings.jsonl`.

### Review Learnings
Read `.context/learnings.jsonl` to see accumulated knowledge.

### Search Learnings
Ask the agent: "What have we learned about [topic]?"

## eclick One Learnings Worth Storing

- How the repository switching (mock/turso) works
- How the bilingual UI detects and persists language
- Order state transition rules and validations
- Customer standing check flow
- Turso connection configuration
- Known gotchas in the domain model
