$ErrorActionPreference = "Stop"

$frontendPath = "frontend-app"
$tempRoot =
    if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP }
    elseif ($env:TEMP) { $env:TEMP }
    else { [System.IO.Path]::GetTempPath() }

$archivePath = Join-Path $tempRoot "wathiq-frontend.tar"
$apiConfigPath = Join-Path (Join-Path (Join-Path $frontendPath "src") "config") "api.ts"

if (Test-Path $frontendPath) {
    Remove-Item -Recurse -Force $frontendPath
}

New-Item -ItemType Directory -Path $frontendPath | Out-Null

git archive --format=tar origin/Wathiq_Frontend -o $archivePath
tar -xf $archivePath -C $frontendPath
Remove-Item $archivePath -Force

if (-not (Test-Path $apiConfigPath)) {
    throw "Could not find frontend API config at $apiConfigPath"
}

@'
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:44302/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem("user");
    if (user) {
      const parsedUser = JSON.parse(user);
      if (parsedUser.token) {
        config.headers.Authorization = `Bearer ${parsedUser.token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
'@ | Set-Content -Path $apiConfigPath -Encoding UTF8

Write-Host "Frontend snapshot created at $frontendPath"
