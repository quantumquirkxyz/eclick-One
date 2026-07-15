# Quality Standards

## TypeScript

- Strict mode enabled (`strict: true` in `tsconfig.base.json`)
- Additional strictness: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`
- `verbatimModuleSyntax: true` — all type imports must use `import type`
- No `any` — use `unknown` and type guards when uncertain
- All function signatures must have explicit return types
- `target: ES2023`, `module: ESNext`, `moduleResolution: Bundler`

## Error Handling

Every API endpoint must handle:
- **Success** — return data with 2xx status
- **Validation error** — return 400 with field-level messages, bilingual
- **Not found** — return 404
- **Server error** — return 500, never leak stack traces or internal details

Error response format: `{ error: { code: string, message: string, details?: unknown } }`

Error codes: `NOT_FOUND` (404), `BAD_REQUEST` (400), `CONFLICT` (409), `SERVICE_UNAVAILABLE` (503), `INTERNAL_ERROR` (500).

API translates error messages via `translateApiMessage()` in `apps/api/src/i18n.ts` — maps known English error strings to Spanish.

Every frontend view must render:
- **Loading state** — spinner or skeleton while data loads
- **Empty state** — helpful message when no data exists
- **Error state** — error message + retry button
- **Success state** — the actual data

## Testing

- Unit tests in `*.test.ts` alongside source files (domain rules, service methods)
- API integration tests in `apps/api/src/` test the full request/response cycle
- Run `bun test` before every commit
- Run `bun run typecheck` before every commit

## Security

- Never commit real database credentials
- `.env` is gitignored; `.env.example` has placeholder values
- Input validation on every API route (required fields, types, business rules)
- No `eval()` or dynamic code execution with user input
- CORS restricted to configured origins (`CORS_ORIGINS` env var)
- SQL mode uses parameterized queries or stored procedures (no string concatenation)
- Internal errors logged server-side but never leaked to API responses
