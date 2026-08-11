@echo off
REM Taruh file ini di folder root project (sejajar sama package.json),
REM lalu double-click buat jalanin dev server (mode webpack, bukan
REM Turbopack, karena Turbopack sering panic di Windows).

cd /d "%~dp0"

echo ============================================
echo   Trading Dashboard - Dev Server (webpack)
echo ============================================
echo.

if not exist node_modules (
  echo [Setup] node_modules belum ada, jalanin "npm install" dulu...
  call npm install
  echo.
)

echo Membuka http://localhost:3000 setelah server siap...
echo Tekan CTRL+C di jendela ini buat stop server.
echo.

call npm run dev:webpack

echo.
echo Server berhenti. Tekan tombol apa saja buat nutup jendela ini.
pause >nul
