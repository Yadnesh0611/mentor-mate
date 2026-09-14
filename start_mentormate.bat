@echo off
title Mentor Mate - Academic Digital Twin Launcher
echo ====================================================================
echo             MENTOR MATE - ACADEMIC DIGITAL TWIN
echo                SIH Internal Round 2 Platform
echo ====================================================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Python environment...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH! Please install Python 3.10+.
    pause
    exit /b 1
)

echo [2/4] Checking Node.js environment...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH! Please install Node.js 18+.
    pause
    exit /b 1
)

echo [3/4] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "Mentor Mate - Backend API" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo [4/4] Starting Next.js Frontend on http://localhost:3000 ...
start "Mentor Mate - Frontend UI" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 3 /nobreak >nul
echo.
echo Launching Mentor Mate in your default browser...
start http://localhost:3000

echo.
echo ====================================================================
echo Mentor Mate is now running!
echo Frontend: http://localhost:3000
echo Backend:  http://127.0.0.1:8000
echo API Docs: http://127.0.0.1:8000/docs
echo ====================================================================
echo.
pause
