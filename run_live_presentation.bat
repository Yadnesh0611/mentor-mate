@echo off
title Mentor Mate - Live Presentation Mode
echo ====================================================================
echo             MENTOR MATE - LIVE PRESENTATION LAUNCHER
echo ====================================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting OmniRoute and OpenClaw Gateways...
start "OmniRoute Gateway" cmd /k "omniroute serve --port 20128 --no-open"
start "OpenClaw Gateway" cmd /k "openclaw gateway run --port 18789 --force"

timeout /t 2 /nobreak >nul

echo [2/3] Starting FastAPI Academic Backend on port 8000...
start "Mentor Mate Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --host 127.0.0.1 --port 8000"

timeout /t 2 /nobreak >nul

echo [3/3] Starting Cloudflare Live HTTPS Tunnel...
start "Cloudflare Live Tunnel" cmd /k "cd /d "%~dp0" && .\cloudflared.exe tunnel --url http://127.0.0.1:8000"

echo.
echo ====================================================================
echo   ALL SYSTEMS ARE LIVE!
echo   Pritesh and Judges can now access the Vercel link!
echo ====================================================================
echo.
pause
