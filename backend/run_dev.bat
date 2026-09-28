@echo off
setlocal
cd /d "%~dp0"

if not exist "venv\Scripts\python.exe" (
    echo [ERROR] Khong tim thay Python trong venv tai: %~dp0venv\Scripts\python.exe
    echo Vui long tao virtual environment bang lenh: python -m venv venv
    exit /b 1
)

echo [EduTutor] Dang khoi dong Django backend bang Python venv...
"venv\Scripts\python.exe" manage.py runserver %*
