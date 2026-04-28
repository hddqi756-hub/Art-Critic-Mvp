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

function Start-Terminal($title, $path, $command) {
  $quotedPath = $path.Replace("'", "''")
  $quotedCommand = $command.Replace("'", "''")
  $script = "Set-Location '$quotedPath'; `$Host.UI.RawUI.WindowTitle = '$title'; $quotedCommand"

  Start-Process powershell.exe -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $script
  )
}

Ensure-Command "node" "Install Node.js first: https://nodejs.org/"
Ensure-Command "npm" "npm should be installed with Node.js."

if (-not (Test-Path $serverEnv)) {
  Write-Step "Creating server/.env from template"
  Copy-Item $serverEnvExample $serverEnv
  Write-Host "Please edit server/.env and set OPENAI_API_KEY before using AI analysis." -ForegroundColor Yellow
}

Ensure-Dependencies $root
Ensure-Dependencies $server

Write-Step "Checking Redis on localhost:6379"
$redisReady = Test-NetConnection -ComputerName localhost -Port 6379 -InformationLevel Quiet
if (-not $redisReady) {
  Write-Host "Redis is not reachable on localhost:6379." -ForegroundColor Yellow
  Write-Host "Start it with: docker run -d --name redis -p 6379:6379 redis"
  Write-Host "The API can still start, but image-generation jobs need Redis."
}

Write-Step "Starting API server, image worker, and frontend"
Start-Terminal "AI Art Tutor API" $server "npm run dev"
Start-Terminal "AI Art Tutor Worker" $server "npm run worker"
Start-Terminal "AI Art Tutor Frontend" $root "npm run dev"

Write-Host ""
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "API health: http://localhost:4000/api/health" -ForegroundColor Green
Write-Host ""
Write-Host "Keep the three opened terminal windows running while developing."
