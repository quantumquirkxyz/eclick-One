---
name: document-release
description: "Post-ship documentation update for eclick One. After shipping a feature, updates README, domain docs, API docs, DB contract, context docs, and translation key references. Catches stale documentation automatically. Use after /ship to keep project docs accurate."
---

# /document-release — Documentation Update

After shipping a feature, update all project documentation.

## Process

### 1. README Check
Does the README accurately describe the project? Update if new features, architecture changes, command changes, or config changes were made.

### 2. Domain Docs
If domain entities or business rules changed, update inline docs in `packages/domain/`.

### 3. API Docs
If API surface changed, update route documentation and request/response examples.

### 4. DB Contract
If repository interface or Turso/SQL mode changed, update `docs/db-contract.md`.

### 5. Context Docs
If the `.context/` reference docs are stale, update technical reference, architecture diagrams, and business rules.

### 6. Translation Keys
Verify all translation keys are documented in the translation files.

## Output
List files updated and what changed. Commit with message `docs: update for <feature>`.
