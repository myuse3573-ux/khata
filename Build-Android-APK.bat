@echo off
title Khata Android APK Builder
color 0A

echo ========================================================
echo               BUILDING KHATA ANDROID APK                
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Building Web App bundle...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Web build failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Syncing Android Native Project...
call npx cap sync android
if %errorlevel% neq 0 (
    echo [ERROR] Capacitor sync failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Compiling Native Android APK with Gradle...
cd android
call gradlew.bat assembleDebug

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  SUCCESS! Native Android APK created successfully!
    echo ========================================================
    echo  APK File Location:
    echo  %~dp0android\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo  Copy 'app-debug.apk' to your Android phone and install!
    echo ========================================================
) else (
    echo.
    echo [ERROR] Android APK build failed. Check logs above.
)

echo.
pause
