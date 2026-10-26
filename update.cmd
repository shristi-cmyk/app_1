@echo off
rem Pulls the latest changes and installs any new packages. A running "npm run dev" reloads by itself;
rem restart it only if package.json or .env changed.
git pull
call npm.cmd install
echo.
echo Up to date. If "npm run dev" is not running, start it with: npm run dev
