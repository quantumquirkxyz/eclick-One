---
name: investigate
description: "Systematic root-cause debugging for eclick One. Iron Law: no fixes without investigation. Traces data flow from HTTP request through route, controller, service, and repository. Forms hypotheses, tests them, fixes, and adds regression tests. Stops after 3 failed fix attempts and reports. Use when something is broken and the cause is not obvious."
---

# /investigate — Debugging

Iron Law: no fixes without investigation. Trace the data flow, find the root cause, then fix.

## Process

### Step 1: Reproduce
```bash
bun run dev:api
# or
bun test --grep "<test-name>"
```

### Step 2: Trace the Data Flow
Follow the path: HTTP request → route → controller → service → repository (mock/turso)

For API issues: route handler in `apps/api/src/routes/`, controller, service, repository.

For frontend issues: React component in `apps/web/src/`, API call, response handling, state rendering.

### Step 3: Form a Hypothesis
State what you believe is happening. Example: "The repository method is returning null instead of an empty array, and the service does not handle null."

### Step 4: Test the Hypothesis
Add a temporary diagnostic or run a focused test. Use `bun test --grep` for targeted test execution.

### Step 5: Fix
After confirming root cause, fix it. Load `.agents/rules/quality-standards.md` for error handling standards.

### Step 6: Verify
Run the full test suite and the manual reproduction case.

### Step 7: Regression Test
Write a regression test that would have caught this bug before the fix.

## Three-Strike Rule
After 3 failed fix attempts, stop and report:
1. What you tried
2. What you learned
3. What remains unknown
4. Ask for guidance

## Output
Write investigation to `.context/investigations/<issue>.md`: reproduction steps, root cause, fix applied, regression test added.
