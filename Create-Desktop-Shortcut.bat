@echo off
title Create Khata Desktop Shortcut
color 0A

cd /d "%~dp0"

set "TARGET_BAT=%~dp0Start-Khata.bat"
set "SHORTCUT_NAME=Khata App.lnk"

echo ========================================================
echo         CREATING KHATA APP DESKTOP SHORTCUT            
echo ========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [Environment]::GetFolderPath('Desktop'); $s = $ws.CreateShortcut([System.IO.Path]::Combine($desktop, '%SHORTCUT_NAME%')); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%~dp0'; $s.WindowStyle = 1; $s.Description = 'Launch Khata App (Server + Web UI)'; $s.Save(); Write-Host 'Shortcut created successfully at:' ($desktop + '\%SHORTCUT_NAME%')"

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Desktop shortcut 'Khata App' created on your Desktop!
    echo You can now double-click 'Khata App' on your Desktop to open the app anytime.
) else (
    echo.
    echo [ERROR] Failed to create shortcut.
)

echo.
echo Press any key to exit...
pause >nul
