---
name: health
description: "Code quality dashboard for eclick One. Checks TypeScript health (typecheck), test health (bun test), dead code (unused exports, imports, files), dependency health (unused deps, version mismatches across workspaces), and build health (bun run build). Produces a summary table. Use regularly to keep the codebase healthy."
---

# /health — Code Quality Dashboard

Check the overall health of the codebase.

## Checks

### 1. TypeScript Health
```bash
bun run typecheck
```

### 2. Test Health
```bash
bun test 2>&1
```

### 3. Dead Code
Check for unused exports, unused imports, orphaned files, stale TODO/FIXME comments.

### 4. Dependency Health
Check `package.json` for unused dependencies and version mismatches across workspaces.

### 5. Build Health
```bash
bun run build
```

## Output

Print a health summary table:

| Check | Status | Details |
|-------|--------|---------|
| TypeScript | ✅/❌ | N errors |
| Tests | ✅/❌ | N/N passing |
| Build | ✅/❌ | - |
| Dead code | N items | files/lines |
| Dependencies | ✅/❌ | N mismatches |

Write full report to `.context/health/<date>.md`.
