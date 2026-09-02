@echo off
echo Menjalankan Backend dan Frontend StoreFlow...

:: Jalankan Backend
start "Backend StoreFlow" cmd /k "cd /d %~dp0backend && npm start"

:: Jalankan Frontend (ini biasanya sudah otomatis buka browser)
start "Frontend StoreFlow" cmd /k "cd /d %~dp0frontend && npm start"
