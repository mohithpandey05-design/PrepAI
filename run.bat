@echo off
title AI Interview Platform Launcher
echo ===================================================
echo     Starting AI Interview Platform Stack...
echo ===================================================

cd /d "%~dp0ai-interview-platform-master"

echo [1/3] Starting MySQL on port 3307...
netstat -ano | findstr :3307 >nul
if errorlevel 1 (
    start "MySQL-3307" /b "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --defaults-file="C:\ProgramData\MySQL\MySQL Server 8.0\my.ini" --datadir="C:\Users\mohit\.ai_interview_mysql_data" --port=3307
) else (
    echo MySQL is already running on port 3307.
)

timeout /t 2 /nobreak >nul

echo [2/3] Starting Backend Server (port 5001)...
cd backend
start "AI-Interview-Backend" /b node server.js

timeout /t 3 /nobreak >nul

echo [3/3] Opening Platform in Browser...
start "" "http://localhost:5001"

echo.
echo All services started! You can access the platform at:
echo   - App URL: http://localhost:5001
echo ===================================================
