---
name: spec
description: "Turn vague intent into a precise, executable spec for eclick One. Five phases: Why, Scope, Technical (with mandatory code reading), Draft, File. Quality gate before filing. Creates a GitHub issue from the spec. Use when a task needs a clear, shared understanding before implementation."
---

# /spec — Specification Author

Turn vague intent into a precise, executable spec.

## Five Phases

### Phase 1: Why
One AskUserQuestion. What pain are we solving? Who feels it? What happens if we do not build it?

### Phase 2: Scope
One AskUserQuestion. What is in scope? What is explicitly out of scope?

### Phase 3: Technical (Code Reading)
Read the relevant code first. Check:
- Existing entities and repository interfaces in `packages/domain/src/`
- Existing services in `apps/api/src/services/` or `packages/domain/src/services/`
- Existing routes in `apps/api/src/routes/`
- Existing frontend components in `apps/web/src/`
- Existing translation files for bilingual support
- `.context/` directory for technical reference
- `.agents/rules/` for architecture and domain rules

### Phase 4: Draft
Write the spec to `.context/specs/<feature-name>.md` with:
- Problem statement
- User stories
- API contract (route, request, response, errors)
- Domain changes
- Frontend components
- Repository changes (mock + Turso)
- Test expectations
- Bilingual labels
- Implementation order

### Phase 5: File
Create a GitHub issue from the spec. Include the spec file path in the issue body.

Then call ExitPlanMode.
