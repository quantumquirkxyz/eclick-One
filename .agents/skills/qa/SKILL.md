---
name: qa
description: "Quality assurance for eclick One. Tests the running application against business rules: customers, orders (full lifecycle with status transitions), payments, products, inventory, and reports. Finds bugs, fixes them with atomic commits, writes regression tests. Verifies bilingual support and responsive layout. Use after implementation is complete."
---

# /qa — Quality Assurance

Test the running application, find bugs, fix them, generate regression tests.

## Process

### 1. Start the App
```bash
bun run dev
```

### 2. Test Each Feature Area

**Customers:** Create with valid data, try missing fields, edit, search, verify standing blocks orders.

**Orders:** Full lifecycle generado → proceso → entregado → facturado. Cancel from proceso, try cancel from entregado (should be blocked). Create for bad-standing customer (should be blocked).

**Payments:** Register for order, verify required before entregado, try duplicate.

**Products:** Create, edit, catalog view.

**Inventory:** Stock levels, replenish, negative prevention.

**Reports:** Generate, filter by date.

### 3. Bug Fix Protocol
For each bug found:
1. Write a failing test
2. Fix the bug
3. Verify the test passes
4. Commit with message format: `fix: description (#regression-test-included)`

### 4. Cross-Cutting Checks
- Switch to Spanish. Are all pages translated?
- Switch to Turso mode (if configured). Do the same flows work?
- Check responsive layout at mobile width
- Verify error states when API is unreachable

## Output

Write QA report to `.context/reviews/qa-<date>.md`: areas tested, bugs found and fixed (with commit refs), regression tests added, remaining issues, overall assessment.
