---
name: cso
description: "Security audit for eclick One. Runs OWASP Top 10 + STRIDE threat model audit on the codebase. Checks for broken access control, cryptographic failures, injection, insecure design, misconfiguration, auth failures, and logging gaps. Every finding includes a concrete exploit scenario. Use before major releases or when handling sensitive data."
---

# /cso — Security Audit

Run an OWASP Top 10 + STRIDE threat model audit on the codebase.

## OWASP Top 10 Checks

| Category | Check |
|----------|-------|
| Broken Access Control | Are there auth checks on every API route? |
| Cryptographic Failures | Are secrets hardcoded? Is the DB connection encrypted? |
| Injection | SQL injection in Turso mode? No eval() of user input? |
| Insecure Design | Are error messages leaking stack traces? |
| Security Misconfiguration | CORS set correctly? Debug mode off? |
| Vulnerable Components | Check package.json for known vulnerabilities |
| Auth Failures | Password handling? Session management? |
| Data Integrity | Are stored procedures validating input? |
| Logging Failures | Are security events logged? |
| SSRF | Does the app fetch user-supplied URLs? |

## eclick One-Specific Checks

- Turso credentials stored in `.env` (not committed)
- `REPOSITORY_MODE=turso` uses encrypted transport for remote databases
- Mock mode returns no real data
- API validates input on every endpoint
- Frontend does not expose internal endpoints
- CORS restricted to the app's own origin
- `.env.example` contains no real secrets
- Error responses do not expose internal details

## STRIDE Per Component

For each component (API routes, domain services, mock repos, Turso adapter, frontend), evaluate: Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation of Privilege.

## Output

Write security audit to `.context/security/audit-<date>.md`. Critical and High findings require AskUserQuestion before closing.
