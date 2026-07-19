# Monorepo Reference

## Identifying Workspace And Package

When a repository contains multiple workspaces or packages, determine which area a change touches by:

1. Inspecting the changed file path against known workspace directories (e.g., `apps/api/`, `apps/web/`, `packages/domain/`).
2. Checking workspace-level `package.json`, `foundry.toml`, or equivalent manifests for the affected package.
3. Mapping the issue labels or description to the responsible workspace if the file path is ambiguous.

## Validation Commands Per Workspace

Run the validation commands for every workspace touched by the change. Use the workspace map in `.project-task-executor-config.json` when available; otherwise use the defaults in `references/config.md` or detect commands from `package.json`, `foundry.toml`, or CI config.

| Workspace | Typecheck | Lint | Test |
|-----------|-----------|------|------|
| `apps/api` | `bun run typecheck` | `bun run lint` | `bun test` |
| `apps/web` | `bun run typecheck` | `bun run lint` | `bun test` |
| `apps/agents` | `bun run typecheck` | `bun run lint` | `bun test` |
| `packages/*` | `bun run typecheck` | `bun run lint` | `bun test` |
| `contracts` | `forge build` | `forge fmt --check` | `forge test` |

If a workspace lacks a specific command, skip that step and note the absence in the PR validation checklist.

## Bilingual String Verification

For `apps/web` changes:

1. Search for hardcoded strings in JSX/TSX: `grep -rn '[\"\\x27][A-Z][a-z]' apps/web/src`.
2. Verify that every user-facing string has an entry in the i18n dictionary and a Spanish translation.
3. Confirm that the browser language detection flow persists the selected language in `localStorage`.

## Mock/SQL Parity

When a change touches both `packages/db` mock and SQL implementations:

1. Run `bun test` with `DB_MODE=mock` and `DB_MODE=turso` (or the repository's SQL mode) in separate steps.
2. Compare query results or service responses between modes. Differences must be resolved before opening the PR.
3. Document any intentional divergence in the PR description.
