param(
    [string]$BackendUrl = "http://127.0.0.1:5005",
    [string]$ApiBaseUrl = "http://127.0.0.1:5005/api"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendPath = Join-Path $repoRoot "frontend-app"
$e2ePath = Join-Path $repoRoot "tests\e2e"
$setupScriptPath = Join-Path $PSScriptRoot "setup-frontend-snapshot.ps1"
$frontendUrl = "http://127.0.0.1:4180"
$frontendUri = [Uri]$frontendUrl

if (-not (Test-Path $frontendPath)) {
    & $setupScriptPath
}

if (-not (Test-Path (Join-Path $frontendPath "node_modules"))) {
    throw "Frontend dependencies are missing. Run npm install inside frontend-app first."
}

if (-not (Test-Path (Join-Path $e2ePath "node_modules"))) {
    throw "Playwright dependencies are missing. Run npm install inside tests\\e2e first."
}

$backendJob = Start-Job -ArgumentList $repoRoot, $BackendUrl -ScriptBlock {
    param($jobRepoRoot, $jobBackendUrl)

    Set-Location $jobRepoRoot
    $env:ASPNETCORE_ENVIRONMENT = "Testing"
    $env:ASPNETCORE_URLS = $jobBackendUrl

    if (-not $env:MongoDB__ConnectionString) {
        $env:MongoDB__ConnectionString = "mongodb://localhost:27017"
    }

    if (-not $env:MongoDB__DatabaseName) {
        $env:MongoDB__DatabaseName = "WathiqE2E"
    }

    dotnet run --no-build --no-launch-profile --project "eArchiveSystem\\eArchiveSystem.csproj"
}

$frontendJob = Start-Job -ArgumentList $frontendPath, $ApiBaseUrl -ScriptBlock {
    param($jobFrontendPath, $jobApiBaseUrl)

    Set-Location $jobFrontendPath
    $env:VITE_API_BASE_URL = $jobApiBaseUrl
    npm.cmd run dev -- --host 127.0.0.1 --port 4180 --strictPort
}

try {
    $backendReady = $false
    $frontendReady = $false
    $testEmail = if ($env:WATHIQ_TEST_EMAIL) { $env:WATHIQ_TEST_EMAIL } else { "admin@example.com" }
    $testPassword = if ($env:WATHIQ_TEST_PASSWORD) { $env:WATHIQ_TEST_PASSWORD } else { "Admin@123" }
    $loginPayload = @{
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json

    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2

        try {
            Invoke-RestMethod `
                -Uri "$ApiBaseUrl/auth/login" `
                -Method Post `
                -ContentType "application/json" `
                -Body $loginPayload `
                -TimeoutSec 10 | Out-Null
            $backendReady = $true
            break
        }
        catch {
        }
    }

    if (-not $backendReady) {
        Receive-Job $backendJob -Keep | Select-Object -Last 80
        throw "Backend did not become ready at $ApiBaseUrl."
    }

    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2

        try {
            $tcpClient = [System.Net.Sockets.TcpClient]::new()
            $tcpClient.Connect($frontendUri.Host, $frontendUri.Port)
            $tcpClient.Dispose()
            $frontendReady = $true
            break
        }
        catch {
            if ($null -ne $tcpClient) {
                $tcpClient.Dispose()
            }
        }
    }

    if (-not $frontendReady) {
        Receive-Job $frontendJob -Keep | Select-Object -Last 80
        throw "Frontend did not become ready at $frontendUrl."
    }

    Set-Location $e2ePath
    $env:WATHIQ_API_BASE_URL = $ApiBaseUrl
    $env:WATHIQ_FRONTEND_DIR = $frontendPath
    $env:WATHIQ_FRONTEND_BASE_URL = $frontendUrl
    $env:WATHIQ_SKIP_FRONTEND_SERVER = "1"

    npx.cmd playwright test --reporter=line
    exit $LASTEXITCODE
}
finally {
    Stop-Job $frontendJob -ErrorAction SilentlyContinue | Out-Null
    Remove-Job $frontendJob -Force -ErrorAction SilentlyContinue | Out-Null
    Stop-Job $backendJob -ErrorAction SilentlyContinue | Out-Null
    Remove-Job $backendJob -Force -ErrorAction SilentlyContinue | Out-Null
}
