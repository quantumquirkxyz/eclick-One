---
name: design-html
description: "Convert design mockups to production HTML/CSS for eclick One. Reads the design direction or DESIGN.md, checks existing React component patterns, and implements production-quality code with proper TypeScript, responsive layout, bilingual support, and all states (loading, empty, error). Use after /design-shotgun or /design-consultation to ship the design."
---

# /design-html — Design to Code

Turn an approved mockup or design direction into production-quality HTML/CSS.

## Process

### 1. Read the Design
Read the design doc, DESIGN.md, or description provided by the user.

### 2. Check Existing Code
Read the existing component structure in `apps/web/src/`. Match the framework (React components, CSS approach, i18n pattern).

### 3. Implement
Write production-quality code:
- Proper TypeScript types
- Responsive layout (mobile-first)
- Bilingual support (use translation keys from `.agents/rules/bilingual.md`)
- Loading/empty/error states
- Accessibility (labels, aria, keyboard nav)
- Follow any design tokens from DESIGN.md

### 4. Verify
```bash
bun run typecheck
```
Check the output in the browser.

### 5. Output
The implementation IS the output. List files created or modified.
