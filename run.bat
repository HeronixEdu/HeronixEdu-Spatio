@echo off
rem Spatio Studio launcher.
rem Works from anywhere — auto-switches to the folder this .bat lives in.

setlocal
title Spatio Studio
cd /d "%~dp0"

rem Match the latest shaded fat JAR by glob so version bumps don't break us.
rem Excludes the pre-shade "original-*.jar" file maven-shade leaves behind.
set "JAR="
for /f "delims=" %%F in ('dir /b /a:-d /o:-d "target\spatio-studio-*.jar" 2^>nul ^| findstr /v /b "original-"') do (
    if not defined JAR set "JAR=target\%%F"
)

if not defined JAR (
    echo.
    echo [run.bat] Fat JAR not found in target\.
    echo Build it first:
    echo    mvn clean package
    echo.
    pause
    exit /b 1
)

where java >nul 2>nul
if errorlevel 1 (
    echo.
    echo [run.bat] Java is not on PATH.
    echo Install Java 17 or newer from https://adoptium.net and try again.
    echo.
    pause
    exit /b 1
)

java -jar "%JAR%" %*
set RC=%errorlevel%

if not "%RC%"=="0" (
    echo.
    echo [run.bat] Spatio exited with code %RC%.
    pause
)

endlocal
exit /b %RC%
