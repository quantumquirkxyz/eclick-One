---
name: plan-eng-review
description: "Engineering architecture review. Locks in architecture, data flow diagrams, state machines, API contracts, test matrix, and failure modes before any code is written. One AskUserQuestion per finding. Use for all significant technical changes."
---

# /plan-eng-review — Architecture Review

Read the design doc and CEO review. Lock architecture before any code is written.

## Sections (one AskUserQuestion per finding)

### 1. Domain Model
- What entities are affected? Any new entities needed?
- What business rules change?
- Does the domain interface need new repository methods?
- Does `monthlyRuleApplies` play a role?

### 2. Data Flow (ASCII Diagram)
```
[Client] -> [Route] -> [Controller] -> [Service] -> [Repository (mock|turso)]
```
Trace every request from HTTP to database and back. Show all error paths.

### 3. State Machine
If this touches orders, show the full order state machine and where the new feature fits.

### 4. API Surface
- Route: `method /api/v1/:resource`
- Request body shape
- Response shape (success + error)
- Status codes for each case

### 5. Frontend
- Which route in the React app?
- New component tree?
- Loading / empty / error / retry states
- Bilingual labels (EN + ES translation keys)

### 6. Repository Layer
- Does mock mode need changes?
- Does SQL mode need changes?
- New stored procedures or queries?

### 7. Test Matrix
| Test | Scope | Mock | SQL |
|------|-------|------|-----|
| Unit test domain rules | domain/ | N/A | N/A |
| Unit test service | api/ | yes | no |
| Integration test | api/ | yes | yes (when SQL configured) |

### 8. Failure Modes
- What if the DB is down?
- What if the request is malformed?
- What if data is in an unexpected state?
- What if the customer is in bad standing?

### 9. Security Concerns
- Who can access this? Authentication?
- Data validation — what are the bounds?
- SQL injection prevention in SQL mode?

## Output

Write the architecture document to `.context/designs/arch-<feature-name>.md` with diagrams. Then call ExitPlanMode.
