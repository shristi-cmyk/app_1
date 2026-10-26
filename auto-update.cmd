@echo off
rem Checks GitHub every 30 seconds and pulls new changes, so edits made for this project show up on localhost.
rem Leave this window open next to the one running "npm run dev". Press Ctrl+C to stop.
setlocal enabledelayedexpansion
cd /d "%~dp0"
echo Watching for updates every 30 seconds. Leave this window open.
:loop
for /f %%i in ('git rev-parse HEAD') do set BEFORE=%%i
git pull --ff-only --quiet
if errorlevel 1 echo [%time%] Could not pull: offline, or local changes are in the way.
for /f %%i in ('git rev-parse HEAD') do set AFTER=%%i
if not "!BEFORE!"=="!AFTER!" (
  echo [%time%] New changes pulled. The page reloads by itself; refresh it if it does not.
  git diff --name-only !BEFORE! !AFTER! > "%TEMP%\research-agent-changed.txt"
  findstr /i /c:"package.json" "%TEMP%\research-agent-changed.txt" >nul && (echo [%time%] Packages changed, installing... & call npm.cmd install & echo Restart npm run dev now.)
  findstr /i /c:"next.config.js" "%TEMP%\research-agent-changed.txt" >nul && echo [%time%] Restart npm run dev to apply the config change.
)
timeout /t 30 /nobreak >nul
goto loop
