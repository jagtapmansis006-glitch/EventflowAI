@echo off
title EventFlow AI - Quick Installer & Launcher
echo ======================================================================
echo             EventFlow AI Platform - One-Click Launcher
echo ======================================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found. Please install Node.js (v18+) to run.
    pause
    exit /b 1
)

:: Install backend if node_modules missing
if not exist "backend\node_modules\" (
    echo [*] Installing Backend dependencies...
    cd backend
    call npm install
    cd ..
)

:: Install unified portal if node_modules missing
if not exist "superadmin\node_modules\" (
    echo [*] Installing Unified Portal dependencies...
    cd superadmin
    call npm install
    cd ..
)

echo.
echo ======================================================================
echo   Launching EventFlow AI (Unified Single Port Matrix)
echo ======================================================================
echo [1/2] Starting Backend API Server (Port 3001)...
start "EventFlow Backend API" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Unified Web Interface (Port 5173)...
start "EventFlow Unified Portal" cmd /k "cd superadmin && npm run dev"

echo.
echo ======================================================================
echo  Open in your browser:
echo 
echo   >>> http://localhost:5173 <<<
echo 
echo  Role-Locked Accounts (Password: EventFlow@2026!):
echo   - Super Admin: superadmin@eventflow.ai  -^> Super Admin Command Matrix
echo   - Event Head:  eventadmin@eventflow.ai  -^> Live Operations Console
echo   - Attendee:    attendee@eventflow.ai    -^> Mobile PWA
echo ======================================================================
echo.
pause
