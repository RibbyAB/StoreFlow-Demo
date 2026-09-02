@echo off
echo Menjalankan Backend dan Frontend Toko Bangunan...

:: Jalankan Backend
start "Backend Toko" cmd /k "cd /d %~dp0backend && npm start"

:: Jalankan Frontend (ini biasanya sudah otomatis buka browser)
start "Frontend Toko" cmd /k "cd /d %~dp0frontend && npm start"