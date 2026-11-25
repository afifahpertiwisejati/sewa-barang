@echo off
title SewaIn+ Server (http://localhost:3000)
cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
echo ============================================
echo   Menjalankan Server SewaIn+ (TiDB Cloud)
echo   Buka di browser: http://localhost:3000/
echo   Jangan tutup jendela ini selama web dipakai
echo ============================================
npm.cmd run dev
pause
