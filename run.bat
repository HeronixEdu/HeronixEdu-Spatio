@echo off
rem Spatio Studio launcher.
rem Works from anywhere — auto-switches to the folder this .bat lives in.

setlocal
title Spatio Studio
cd /d "%~dp0"

set "JAR=target\spatio-studio-1.0.0-SNAPSHOT.jar"

if not exist "%JAR%" (
    echo.
    echo [run.bat] Fat JAR not found at:
    echo    %CD%\%JAR%
    echo.
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
