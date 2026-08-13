@echo off
title Khata App Launcher
color 0B

echo ========================================================
echo                 STARTING KHATA APP                     
echo ========================================================
echo.

cd /d "%~dp0"

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not found in PATH!
    echo Please download and install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Install dependencies if missing
if not exist "node_modules\" (
    echo [INFO] Installing dependencies (first-time setup)
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Dependency installation failed!
        pause
        exit /b 1
    )
)

echo [INFO] Launching Backend Server and Frontend UI
echo [INFO] Opening http://localhost:5173 in browser
echo [INFO] Keep this window open while using the app
echo ========================================================
echo.

:: Open browser automatically after 3 seconds (using ping delay for Windows compatibility)
start "" /b cmd /c "ping 127.0.0.1 -n 4 >nul & start http://localhost:5173"

:: Run Backend Server and Vite Frontend together
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] App server stopped unexpectedly.
    pause
)
