@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请安装 Node.js 18 或以上版本，再打开此文件。
  pause
  exit /b 1
)
node serve.js
pause
