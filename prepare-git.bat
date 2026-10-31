@echo off
echo ========================================================
echo  Brightloop Software - Member 3 Git Preparation Script
echo  Branch: feature/billing-payments
echo ========================================================

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not found in your system PATH.
    echo Please install Git for Windows (https://git-scm.com/download/win)
    echo or run these commands inside Git Bash.
    pause
    exit /b 1
)

echo [1/4] Initializing Git repository...
git init

echo [2/4] Switching to branch: feature/billing-payments...
git checkout -b feature/billing-payments 2>nul || git checkout feature/billing-payments

echo [3/4] Staging files...
git add .

echo [4/4] Creating commit...
git commit -m "feat(billing): implement Member 3 recurring billing engine, invoice generation, and payment reconciliation"

echo.
echo ========================================================
echo  SUCCESS! Repository is committed and ready to push!
echo ========================================================
echo.
echo To push to your team's GitHub repository, run:
echo.
echo   git remote add origin https://github.com/YOUR_TEAM/brightloop-subscriptions.git
echo   git push -u origin feature/billing-payments
echo.
pause
