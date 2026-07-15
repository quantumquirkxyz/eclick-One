# Quality Standards

## TypeScript

- Strict mode enabled (`strict: true`)
- No `any` — use `unknown` and type guards when uncertain
- All function signatures must have explicit return types
- Prefer `interface` over `type` for object shapes

## Error Handling

Every API endpoint must handle:
- **Success** — return data with 2xx status
- **Validation error** — return 400 with field-level messages
- **Not found** — return 404
- **Server error** — return 500, never leak stack traces or internal details

Error response format: `{ error: { code: string, message: string, details?: unknown } }`

If the project supports multiple languages, translate error messages.

Every frontend view must render:
- **Loading state** — skeleton or spinner while data loads
- **Empty state** — helpful message when no data exists
- **Error state** — error message + retry button
- **Success state** — the actual data

## Testing

- Unit tests in `*.test.ts` alongside source files
- Every service method needs a unit test
- Every repository method needs a unit test (mock mode)
- Every bug fix needs a regression test
- Run the test suite before every commit
- Run typecheck before every commit

## Security

- Never commit real credentials
- `.env` is gitignored; `.env.example` has placeholder values
- Input validation on every API route
- No `eval()` or dynamic code execution with user input
- CORS restricted to the app's own origin in production
- SQL mode uses parameterized queries or stored procedures (no string concatenation)
- Internal errors logged server-side but never leaked to API responses
