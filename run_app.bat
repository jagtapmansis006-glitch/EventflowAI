@echo off
title EventFlow AI Platform Launcher
echo ========================================================
echo          Starting EventFlow AI Platform (Single Port)
echo ========================================================
echo.
echo [1/2] Launching Backend Server on http://localhost:3001...
start "EventFlow Backend API" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak >nul

echo [2/2] Launching Unified Web Portal on http://localhost:5173...
start "EventFlow Unified Portal" cmd /k "cd superadmin && npm run dev"
echo.
echo ========================================================
echo  All 3 roles are interconnected on a SINGLE PORT:
echo 
echo   >>> http://localhost:5173 <<<
echo 
echo  Pre-configured Accounts (Password: EventFlow@2026!):
echo   - 🛡️  Super Admin: superadmin@eventflow.ai
echo   - 👔  Event Head:  eventadmin@eventflow.ai
echo   - 🎟️  Attendee:    attendee@eventflow.ai
echo ========================================================
echo.
pause
