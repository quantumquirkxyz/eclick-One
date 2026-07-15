---
name: benchmark
description: "Performance measurement for eclick One. Measures frontend page load times, bundle sizes, API response times, and resource payload sizes. Compares current branch against main to detect regressions. Any regression over 10% is flagged for user review. Use after performance-sensitive changes."
---

# /benchmark — Performance Measurement

Measure page load times, Core Web Vitals, and resource sizes. Compare before/after.

## What to Measure

### Frontend
- Page load time (DOMContentLoaded, load event)
- Bundle sizes (JS, CSS) per page
- Number of HTTP requests per page
- Time to interactive

### API
- Response time for key endpoints: customers, orders, payments, products
- Time to first byte (TTFB)
- Response payload sizes

## Process

1. Start the app
2. Run measurements on the current branch
3. Switch to main branch and run same measurements
4. Compare

## Output

Print a comparison table:

| Metric | Main | Branch | Δ |
|--------|------|--------|---|
| Bundle size | X KB | Y KB | +Z KB |
| API response time | X ms | Y ms | +Z ms |
| Page load | X ms | Y ms | +Z ms |

Write to `.context/benchmarks/<date>.md`. Flag any regression > 10% for user review.
