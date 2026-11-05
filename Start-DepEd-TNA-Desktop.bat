@echo off
title DepEd TNA - Desktop Launcher
cd /d "%~dp0frontend"

if exist "release\win-unpacked\DepEd TNA.exe" (
  start "" "release\win-unpacked\DepEd TNA.exe"
  exit /b 0
)

if exist "release\DepEd TNA 1.0.0.exe" (
  start "" "release\DepEd TNA 1.0.0.exe"
  exit /b 0
)

if exist "node_modules\.bin\electron.cmd" (
  call npm run desktop
  exit /b 0
)

echo Installing Desktop App dependencies for first-time setup...
call npm install -D electron electron-builder
call npm run desktop
