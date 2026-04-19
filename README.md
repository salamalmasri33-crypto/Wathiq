# Wathiq

Wathiq is a document archiving system that digitizes documents, extracts text through OCR, and lets users manage, search, and review archived content through a web interface.

## Repository layout

- `eArchiveSystem/`: main ASP.NET Core backend
- `eArchive.OcrService/`: OCR microservice
- `tests/eArchiveSystem.Tests/`: unit tests
- `tests/eArchiveSystem.IntegrationTests/`: API integration tests
- `tests/performance/`: performance scripts and results
- `tests/e2e/`: Playwright end-to-end tests
- `docs/testing/`: testing documentation

## Prerequisites

- .NET 8 SDK
- MongoDB running locally on `mongodb://localhost:27017`
- Node.js 18+ for Playwright E2E tests
- Tesseract OCR if you want to run the OCR service manually
- k6 if you want to execute the included performance script

## Running the backend

### Main backend

```powershell
cd eArchiveSystem
dotnet restore
dotnet run
```

### OCR service

```powershell
cd eArchive.OcrService
dotnet restore
dotnet run
```

## Running the test suites

### Unit tests

```powershell
dotnet test tests/eArchiveSystem.Tests/eArchiveSystem.Tests.csproj
```

### Integration tests

The integration suite uses the real ASP.NET Core application and MongoDB.

```powershell
$env:WATHIQ_TEST_MONGODB_CONNECTION="mongodb://localhost:27017"
dotnet test tests/eArchiveSystem.IntegrationTests/eArchiveSystem.IntegrationTests.csproj
```

### Performance tests

The performance flow uses the bootstrap admin account by default.

```powershell
$env:ASPNETCORE_ENVIRONMENT="Testing"
$env:ASPNETCORE_URLS="http://127.0.0.1:5005"
$env:WATHIQ_API_BASE_URL="http://127.0.0.1:5005/api"
k6 run tests/performance/k6/login-and-search.js
```

If `k6` is not installed locally, you can run the same script with Docker Desktop:

```powershell
docker run --rm -w /workspace `
  -v "${PWD}:/workspace" `
  -e WATHIQ_API_BASE_URL="http://host.docker.internal:5005/api" `
  -e WATHIQ_TEST_EMAIL="admin@example.com" `
  -e WATHIQ_TEST_PASSWORD="Admin@123" `
  grafana/k6 run tests/performance/k6/login-and-search.js
```

Generated summaries are written to `tests/performance/results/`.

### End-to-end tests

The frontend lives on the `Wathiq_Frontend` branch. Materialize it into a local snapshot first:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-frontend-snapshot.ps1
```

Then install frontend and Playwright dependencies, and run the browser suite:

```powershell
cd frontend-app
npm install
cd ..\tests\e2e
npm install
npx playwright install
cd ..\..
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1
```

Environment variables you can override:

- `WATHIQ_FRONTEND_DIR`
- `WATHIQ_FRONTEND_BASE_URL`
- `WATHIQ_API_BASE_URL`
- `WATHIQ_TEST_EMAIL`
- `WATHIQ_TEST_PASSWORD`

## CI

GitHub Actions is configured in `.github/workflows/ci.yml`.
The pipeline restores dependencies, builds the solution, runs unit tests, runs integration tests against MongoDB, runs Playwright E2E against the frontend snapshot, and executes GitLeaks.

## In-Session Practical

The in-session practical item from the assignment is demonstrated live during the lab session. The repository artifacts in this project prepare the groundwork for that discussion through real tests, CI automation, security scanning, and executable E2E/performance flows.

## Team

- Backend & OCR: Salam Almasri and Bushra Alshaabani
- Frontend: Najat Bostaty
