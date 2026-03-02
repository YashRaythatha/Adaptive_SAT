@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
pushd "%ROOT%backend" || (echo Failed to cd to backend & exit /b 1)

if not exist ".env" (
  if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul
    echo Created backend\.env from .env.example
  ) else (
    echo Missing backend\.env - and .env.example not found.
    echo Please create backend\.env and set DATABASE_URL.
    goto :error
  )
)

if not exist ".venv\Scripts\python.exe" (
  echo Creating backend virtual environment
  py -3.12 -m venv .venv 2>nul
  if errorlevel 1 (
    py -3.11 -m venv .venv 2>nul
  )
  if errorlevel 1 (
    python -m venv .venv 2>nul
  )
  if not exist ".venv\Scripts\python.exe" (
    echo Failed to create venv. Install Python and ensure py or python is in PATH.
    goto :error
  )
  set "DO_PIP_INSTALL=1"
)

call ".venv\Scripts\activate.bat"
if errorlevel 1 (
  echo Failed to activate venv.
  goto :error
)

if defined DO_PIP_INSTALL (
  echo Installing backend dependencies
  python -m pip install --upgrade pip -q
  python -m pip install -r requirements.txt
  if errorlevel 1 (
    echo pip install failed.
    goto :error
  )
)

echo/
set "HOST=127.0.0.1"
set "APP=app.main:app"
set "PORT=8000"

rem If 8000 is in use, use 8001
netstat -ano | findstr /C:":8000 " | findstr /I "LISTENING" >nul
if not errorlevel 1 (
  set "PORT=8001"
  echo Port 8000 in use - using 8001
)
echo/
echo Starting backend at http://%HOST%:%PORT%  - Docs: /docs
echo Press Ctrl+C to stop.
echo/
python -m uvicorn %APP% --host %HOST% --port %PORT% --reload
goto :done

:error
echo/
echo Backend failed to start.
pause
exit /b 1

:done
popd
endlocal
