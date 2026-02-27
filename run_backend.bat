@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
pushd "%ROOT%backend" || (echo Failed to cd to backend && exit /b 1)

if not exist ".env" (
  if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul
    echo Created backend\.env from .env.example
  ) else (
    echo Missing backend\.env (and .env.example not found).
    echo Please create backend\.env and set DATABASE_URL.
    goto :error
  )
)

if not exist ".venv\Scripts\python.exe" (
  echo Creating backend virtual environment (.venv)...
  py -3.12 -m venv .venv
  if errorlevel 1 (
    echo Failed to create venv with Python 3.12.
    echo Trying: py -3.11 -m venv .venv
    py -3.11 -m venv .venv
  )
  if not exist ".venv\Scripts\python.exe" (
    echo Failed to create venv. Ensure Python is installed and the Python launcher ^(py^) works.
    goto :error
  )
)

call ".venv\Scripts\activate.bat"
if errorlevel 1 (
  echo Failed to activate venv.
  goto :error
)

echo Installing backend dependencies...
python -m pip install --upgrade pip >nul
python -m pip install -r requirements.txt
if errorlevel 1 (
  echo pip install failed.
  goto :error
)

echo.
echo Starting backend at http://127.0.0.1:8000  ^(Docs: /docs^)
echo Press Ctrl+C to stop.
echo.
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
goto :done

:error
echo.
echo Backend failed to start.
pause
exit /b 1

:done
popd
endlocal
