@echo off
echo ============================================
echo  Khata MongoDB Setup - Run as Administrator
echo ============================================
echo.

REM Step 1: Disable auth in mongod.cfg
echo Step 1: Disabling MongoDB auth temporarily...
powershell -Command "(Get-Content 'C:\Program Files\MongoDB\Server\8.3\bin\mongod.cfg') -replace '  authorization: enabled', '  authorization: disabled' | Set-Content 'C:\Program Files\MongoDB\Server\8.3\bin\mongod.cfg'"
echo   Done.

REM Step 2: Restart MongoDB service
echo Step 2: Restarting MongoDB service...
net stop MongoDB
timeout /t 3 /nobreak >nul
net start MongoDB
timeout /t 3 /nobreak >nul
echo   Done.

REM Step 3: Create the khata_db user
echo Step 3: Creating khata_admin user...
node "%~dp0server\scripts\createMongoUser.js"
echo   Done.

REM Step 3b: Update server/.env with credentials
echo Step 3b: Updating server/.env with MongoDB credentials...
powershell -Command "$env = Get-Content '%~dp0server\.env'; $env = $env -replace 'MONGODB_URI=.*', 'MONGODB_URI=mongodb://khata_admin:khata2026@localhost:27017/khata_db?authSource=admin'; $env | Set-Content '%~dp0server\.env'"
echo   Done.

REM Step 4: Re-enable auth
echo Step 4: Re-enabling MongoDB auth...
powershell -Command "(Get-Content 'C:\Program Files\MongoDB\Server\8.3\bin\mongod.cfg') -replace '  authorization: disabled', '  authorization: enabled' | Set-Content 'C:\Program Files\MongoDB\Server\8.3\bin\mongod.cfg'"
echo   Done.

REM Step 5: Restart MongoDB again with auth enabled
echo Step 5: Restarting MongoDB with auth enabled...
net stop MongoDB
timeout /t 3 /nobreak >nul
net start MongoDB
timeout /t 3 /nobreak >nul
echo   Done.

echo.
echo ============================================
echo  Setup complete! MongoDB user created.
echo  Username: khata_admin
echo  Password: khata2026
echo  Database: khata_db
echo.
echo  server/.env has been updated automatically.
echo  Now run: npm run server
echo ============================================
pause
