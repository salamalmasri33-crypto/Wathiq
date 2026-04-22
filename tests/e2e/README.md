# End-to-End Tests

Wathiq E2E coverage is implemented with Playwright in this directory.

Current scenarios:
- admin login through the real frontend UI and redirect to the protected dashboard
- user document flow through the real frontend UI: upload a file, save metadata, search for the document, and verify the created result

Recommended setup:
1. Materialize the frontend branch into a local snapshot:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-frontend-snapshot.ps1
```

2. Install frontend and Playwright dependencies:

```powershell
cd frontend-app
npm install
cd ..\tests\e2e
npm install
npx playwright install
```

3. Return to the repository root and run the browser suite with the helper script:

```powershell
cd ..\..
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1
```

Useful environment variables:
- `WATHIQ_FRONTEND_DIR` default: `frontend-app`
- `WATHIQ_FRONTEND_BASE_URL` default: `http://127.0.0.1:4173`
- `WATHIQ_API_BASE_URL` default: `http://127.0.0.1:5005/api`
- `WATHIQ_TEST_EMAIL` default: `admin@example.com`
- `WATHIQ_TEST_PASSWORD` default: `Admin@123`
