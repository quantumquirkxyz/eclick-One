---
name: guard
description: "Maximum safety mode. Combines /careful (destructive command warnings) and /freeze (edit boundary) in one command. Use for production work, database operations, or when maximum guardrails are needed. /guard <directory> activates both at once."
---

# /guard — Full Safety

Combines `/careful` (destructive command warnings) and `/freeze` (edit boundary) in one command.

## Usage

```
/guard packages/domain   # Safety + edits restricted to packages/domain
```

## Behavior

- Warns before destructive commands
- Blocks edits outside the specified directory
- Removes both restrictions on explicit override
- Use for production work or when you need maximum guardrails
