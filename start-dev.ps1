$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$server = Join-Path $root "server"
$serverEnv = Join-Path $server ".env"
$serverEnvExample = Join-Path $server ".env.example"

function Write-Step($message) {
  Write-Host ""
  Write-Host "==> $message" -ForegroundColor Cyan
}

function Ensure-Command($name, $hint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Host "Missing command: $name" -ForegroundColor Red
    Write-Host $hint
    exit 1
  }
}

function Ensure-Dependencies($path) {
  if (-not (Test-Path (Join-Path $path "node_modules"))) {
    Write-Step "Installing dependencies in $path"
    Push-Location $path
    npm install
    Pop-Location
  }
}

Ensure-Command "node" "Install Node.js first: https://nodejs.org/"
Ensure-Command "npm" "npm should be installed with Node.js."

if (-not (Test-Path $serverEnv)) {
  Write-Step "Creating server/.env from template"
  Copy-Item $serverEnvExample $serverEnv
  Write-Host "Edit server/.env and set OPENAI_API_KEY when you want real AI analysis." -ForegroundColor Yellow
}

Ensure-Dependencies $root
Ensure-Dependencies $server

Write-Step "Starting AI Art Tutor in this single window"
Write-Host "Frontend:   http://localhost:5173" -ForegroundColor Green
Write-Host "API health: http://localhost:4000/api/health" -ForegroundColor Green
Write-Host ""
Write-Host "The browser will open automatically. Logs are prefixed with API and WEB." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop both." -ForegroundColor Yellow
Write-Host ""

Push-Location $root
try {
  npm run dev:all
} finally {
  Pop-Location
}
