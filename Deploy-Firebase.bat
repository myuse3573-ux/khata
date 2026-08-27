@echo off
title Deploy Khata to Firebase Hosting
color 0A
echo ========================================================
echo   KHATA APP - DEPLOY TO FIREBASE HOSTING
echo ========================================================
echo.

echo [1/3] Building production web app...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed. Please check errors above.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Checking Firebase Login...
echo (If prompted, log in with your Google account that owns the kitchen-khata project)
call npx -y firebase-tools login --reauth

echo.
echo [3/3] Deploying to Firebase Hosting and Cloud Firestore...
call npx -y firebase-tools deploy --project kitchen-khata

echo.
echo ========================================================
echo   DEPLOYMENT COMPLETE!
echo   Your live app: https://kitchen-khata.web.app
echo ========================================================
pause
