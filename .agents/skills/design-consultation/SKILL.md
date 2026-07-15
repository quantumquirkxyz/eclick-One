---
name: design-consultation
description: "Design system creation for eclick One. Builds a complete design system from scratch: researches the landscape, proposes creative risks, defines design tokens (colors, typography, spacing, layout, motion), and generates a DESIGN.md. Optionally builds component previews. Use when starting a new project or refreshing the visual identity."
---

# /design-consultation — Design System

Build a complete design system from scratch or refresh the existing one.

## Process

### 1. Research the Landscape
What do similar e-commerce and operations apps look like? What design systems exist in the React ecosystem?

### 2. Propose Creative Risks
What visual direction makes sense for an operations console in Panama? What distinguishes this from a generic admin template?

### 3. Define Design Tokens

**Colors** — primary brand color, semantic colors (success, warning, error, info), neutral palette, surface colors

**Typography** — font stacks for display, body, UI labels, data tables, code; type scale; line heights and weights

**Spacing** — base unit, density, scale

**Layout** — grid columns, max content widths, border radii, shadow levels

**Motion** — easing functions, durations, what gets animated

### 4. Generate a DESIGN.md
Write to `DESIGN.md` at project root with all design tokens and rationale.

## Output
- `DESIGN.md` with complete design system
- Component examples (optional)
