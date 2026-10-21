@echo off
setlocal
cd /d "%~dp0"
echo CleanTown AI startup helper
echo.
py -3.12 --version >nul 2>&1
if errorlevel 1 (
  echo Python 3.12 was not found using the Windows py launcher.
  echo Install Python 3.12 64-bit from https://www.python.org/downloads/release/python-31210/
  echo Then reopen this file.
  pause
  exit /b 1
)
echo Installing/updating CleanTown vision dependencies...
py -3.12 -m pip install --upgrade pip
if errorlevel 1 goto failed
py -3.12 -m pip install -r requirements-vision.txt
if errorlevel 1 goto failed
echo.
echo Starting CleanTown. Keep this window open.
echo Open http://127.0.0.1:8787 in your browser.
py -3.12 server.py
pause
exit /b 0
:failed
echo.
echo Dependency installation failed. Copy the error above for troubleshooting.
pause
exit /b 1
