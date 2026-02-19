@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ===================================
echo    Travel Assistant - Dev Server
echo ===================================
echo.

echo [Cleanup] Stopping Node.js processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [Starting] Launching servers...
set USE_LOCAL_BACKEND=true

:: Start Backend
start "Backend Server" cmd /k "cd functions\dev-server && node server.js"
timeout /t 3 /nobreak >nul

:: Start Frontend
start "Frontend Server" cmd /k "npm run dev"

echo.
echo [Done] Backend and Frontend windows opened
echo Backend: http://localhost:8787
echo Frontend: http://localhost:8080
timeout /t 2 /nobreak >nul
