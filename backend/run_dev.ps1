$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPython = Join-Path $scriptDir "venv\Scripts\python.exe"
$managePy = Join-Path $scriptDir "manage.py"

if (-not (Test-Path $venvPython)) {
    Write-Host "[ERROR] Khong tim thay Python trong venv tai: $venvPython" -ForegroundColor Red
    Write-Host "Vui long tao venv va cai requirements: .\venv\Scripts\python.exe -m pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

Write-Host "[EduTutor] Dang khoi dong Django backend bang: $venvPython" -ForegroundColor Cyan
& $venvPython $managePy runserver $args
