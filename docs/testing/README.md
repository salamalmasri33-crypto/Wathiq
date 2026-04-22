# Testing Strategy

This folder documents the testing setup for Wathiq.

Current scope:
- `tests/eArchiveSystem.Tests`: unit tests for backend business logic and security helpers.
- `tests/eArchiveSystem.IntegrationTests`: API-level integration tests that exercise the real ASP.NET Core application against MongoDB.
- `tests/performance`: performance and load test assets.
- `tests/e2e`: browser-based end-to-end tests for login/dashboard and a full upload/save/search document flow, executed locally with `scripts/run-e2e.ps1`.
- `docs/testing/performance-optimization-case-study.md`: documented bonus case study for the search optimization with measurable before/after evidence.

Expected deliverables for the assignment:
- Meaningful unit tests
- Real integration tests
- Performance test definitions and results
- Playwright E2E coverage
- CI visibility and run instructions in the repository README
- A staged GitHub Actions graph using dependent jobs (`needs`) so the pipeline stages are visible on the repository Actions page.

Note:
- The live in-session practical is not a repository artifact. It is demonstrated during the session itself, while the repository already contains the testing setup and evidence needed for the other graded items.
