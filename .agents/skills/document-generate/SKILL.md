---
name: document-generate
description: "Documentation generator. Reads source code and generates documentation using the Diataxis framework: tutorial (learning-oriented), how-to (task-oriented), reference (information-oriented), and explanation (understanding-oriented). Use when you need docs for a feature, module, or workflow that does not exist yet."
---

# /document-generate — Documentation Generator

Generate missing documentation from scratch by reading the codebase.

## Diataxis Framework

Generate docs in four categories:

### Tutorial (learning-oriented)
Step-by-step walkthrough for a common task. Example: "How to add a new API endpoint"

### How-to Guide (task-oriented)
Specific, practical steps for a goal. Example: "How to configure SQL mode"

### Reference (information-oriented)
Technical description of the system. Example: "API route reference" or "Domain entity reference"

### Explanation (understanding-oriented)
Background, context, design decisions. Example: "Why we use the repository pattern" or "Order lifecycle explained"

## Process

1. Read the relevant source code
2. Load `.agents/rules/` for architecture and domain context
3. Identify which Diataxis category is needed
4. Generate the doc
5. Ask the user where to save it (default: `docs/`)

## Project-Specific Topics

- Repository pattern (how mock and SQL modes work)
- Order state machine (status transitions and rules)
- Bilingual architecture (how EN/ES works)
- Customer standing rules
- Adding a new entity (end-to-end walkthrough)
- Development setup guide
