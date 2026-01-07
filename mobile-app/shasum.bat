@echo off
setlocal enabledelayedexpansion

REM shasum wrapper for Windows - outputs: hash  filename
REM Usage: shasum [-a 256] filename

set FILE=
set ALGO=SHA256

:parse
if "%~1"=="" goto compute
if /i "%~1"=="-a" (
    set ALGO=SHA%~2
    shift
    shift
    goto parse
)
set FILE=%~1
shift
goto parse

:compute
if "%FILE%"=="" (
    echo Usage: shasum [-a algorithm] filename >&2
    exit /b 1
)

REM Use PowerShell for reliable hash computation
powershell -NoProfile -Command "$h = (Get-FileHash -Path '%FILE%' -Algorithm %ALGO%).Hash.ToLower(); Write-Host \"$h  %FILE%\""
