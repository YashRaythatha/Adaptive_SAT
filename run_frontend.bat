@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
pushd "%ROOT%frontend" || (echo Failed to cd to frontend && exit /b 1)

if not exist ".env" (
  if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul
    echo Created frontend\.env from .env.example
  ) else (
    echo Missing frontend\.env (and .env.example not found).
    goto :error
  )
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not on PATH.
  echo Install Node 18+ from https://nodejs.org/ and reopen this terminal.
  goto :error
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is not on PATH.
  echo Reinstall Node 18+ from https://nodejs.org/ and reopen this terminal.
  goto :error
)

if not exist "node_modules" (
  echo Installing frontend dependencies...
  npm install
  if errorlevel 1 (
    echo npm install failed.
    goto :error
  )
)

echo.
echo Starting frontend at http://localhost:3000
echo Press Ctrl+C to stop.
echo.
npm run dev
goto :done

:error
echo.
echo Frontend failed to start.
pause
exit /b 1

:done
popd
endlocal
