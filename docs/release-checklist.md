# Release Checklist

## Pre-Release

- [ ] All `priority:critical` and `priority:high` issues closed
  - Issue #41 (this checklist) in progress
- [ ] CI pipeline green (typecheck + all tests + build)
  - TypeScript strict mode enforced across all packages
  - All Bun tests passing: `bun test`
  - All Forge tests passing: `forge test`
  - Build succeeds: `bun run build`
- [ ] Coverage thresholds met (70% line, 60% branch)
  - Current coverage status: requires verification
- [ ] All E2E tests passing
  - E2E test framework (Playwright) to be configured per issue #14
- [ ] QA runbook completed
  - QA runbook to be created per issue #17
- [ ] Staging environment verified end-to-end
  - Staging environment to be set up per issue #20
- [ ] No known bugs in open issues
  - Verify no open issues with `status:blocker` label
- [ ] Changelog updated
  - Add entry for this release
- [ ] Version bump in package.json (0.2.0)
  - Current version: 0.1.0
- [ ] Git tag created
  - Tag format: `v0.2.0`

## Release

- [ ] GitHub Release created with release notes
  - Draft release notes in `docs/release-notes.md`
- [ ] Docker images built and pushed
  - Docker configuration to be created per issue #19
- [ ] Production deployment completed
  - Deployment guide to be created per issue #37
- [ ] Health check passing
  - Health endpoint: `/api/v1/health`
- [ ] Smoke test on production
  - Verify core flows: orders, payments, products
- [ ] Monitoring and alerting configured
  - Health monitoring to be set up per issue #23

## Post-Release

- [ ] Release notes published
  - Share on project board
- [ ] Demo walkthrough recorded
  - Walkthrough script to be created per issue #38
- [ ] Stakeholders notified

## Checklist for Next Release

- Review and update this checklist based on lessons learned
- Add new items as they arise from the release process