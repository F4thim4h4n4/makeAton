# PowerShell Git Preparation Script for Member 3
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Brightloop Software - Member 3 Git Preparation Script" -ForegroundColor Cyan
Write-Host " Branch: feature/billing-payments" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    Write-Host "[ERROR] Git was not found in PATH." -ForegroundColor Red
    Write-Host "Please install Git for Windows (https://git-scm.com/download/win)" -ForegroundColor Yellow
    Write-Host "or open Git Bash in this directory and run:" -ForegroundColor Yellow
    Write-Host "  git init" -ForegroundColor White
    Write-Host "  git checkout -b feature/billing-payments" -ForegroundColor White
    Write-Host "  git add ." -ForegroundColor White
    Write-Host '  git commit -m "feat(billing): implement Member 3 recurring billing engine, invoice generation, and payment reconciliation"' -ForegroundColor White
    exit 1
}

Write-Host "[1/4] Initializing Git repository..." -ForegroundColor Green
git init

Write-Host "[2/4] Switching to branch feature/billing-payments..." -ForegroundColor Green
git checkout -b feature/billing-payments 2>$null
if ($LASTEXITCODE -ne 0) {
    git checkout feature/billing-payments
}

Write-Host "[3/4] Staging files..." -ForegroundColor Green
git add .

Write-Host "[4/4] Creating commit..." -ForegroundColor Green
git commit -m "feat(billing): implement Member 3 recurring billing engine, invoice generation, and payment reconciliation"

Write-Host "`nSUCCESS! Repository is committed and ready to push!" -ForegroundColor Green
Write-Host "Run these two commands to push to your GitHub remote:" -ForegroundColor Yellow
Write-Host "  git remote add origin <YOUR_GITHUB_REPO_URL>" -ForegroundColor White
Write-Host "  git push -u origin feature/billing-payments" -ForegroundColor White
