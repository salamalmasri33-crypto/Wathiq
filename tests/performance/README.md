# Performance Tests

Wathiq performance tests are implemented with `k6`.

Current scope:
- `k6/login-and-search.js`: authenticates against the backend and exercises the protected document search API.
- `results/`: stores generated summaries that can be attached to the assignment submission.

Suggested local run:

```powershell
$env:ASPNETCORE_ENVIRONMENT="Testing"
$env:ASPNETCORE_URLS="http://127.0.0.1:5005"
$env:WATHIQ_API_BASE_URL="http://127.0.0.1:5005/api"
k6 run tests/performance/k6/login-and-search.js
```

Docker alternative if `k6` is not installed locally:

```powershell
docker run --rm -w /workspace `
  -v "${PWD}:/workspace" `
  -e WATHIQ_API_BASE_URL="http://host.docker.internal:5005/api" `
  -e WATHIQ_TEST_EMAIL="admin@example.com" `
  -e WATHIQ_TEST_PASSWORD="Admin@123" `
  grafana/k6 run tests/performance/k6/login-and-search.js
```

Useful environment variables:
- `WATHIQ_API_BASE_URL` default: `http://127.0.0.1:5005/api`
- `WATHIQ_TEST_EMAIL` default: `admin@example.com`
- `WATHIQ_TEST_PASSWORD` default: `Admin@123`
- `WATHIQ_SEARCH_QUERY` default: `report`
- `WATHIQ_K6_VUS` default: `5`
- `WATHIQ_K6_DURATION` default: `30s`

Example:

```powershell
$env:WATHIQ_API_BASE_URL="http://127.0.0.1:5005/api"
$env:WATHIQ_TEST_EMAIL="admin@example.com"
$env:WATHIQ_TEST_PASSWORD="Admin@123"
k6 run tests/performance/k6/login-and-search.js
```
