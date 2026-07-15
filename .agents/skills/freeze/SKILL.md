---
name: freeze
description: "Edit lock. Restricts file edits to a single directory to prevent accidental changes outside scope while debugging or working on a tightly scoped change. Reads are still allowed everywhere. Run /freeze with a directory path to lock edits to that directory."
---

# /freeze — Edit Lock

Restrict file edits to a single directory. Prevents accidental changes outside scope.

## Usage

```
/freeze apps/api            # Only edit files under apps/api/
/freeze packages/domain     # Only edit files under packages/domain/
/freeze apps/web/src        # Only edit files under apps/web/src/
```

## Behavior

- All edits, writes, and modifications outside the frozen directory are blocked
- Reads outside the directory are still allowed
- The agent will explain why a blocked edit was attempted
- Running `/freeze` again with a new path replaces the boundary
- `/unfreeze` removes the restriction
