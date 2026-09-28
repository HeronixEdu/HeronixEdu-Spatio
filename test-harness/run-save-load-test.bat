@echo off
rem Runs test-harness\save-load-test.html in headless Edge (or Chrome) and prints the report.
setlocal
cd /d "%~dp0"
set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%BROWSER%" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set "PAGE=file:///%CD:\=/%/save-load-test.html"
set "PROFILE=%TEMP%\spatio-test-profile"
"%BROWSER%" --headless --disable-gpu --no-first-run --allow-file-access-from-files --user-data-dir="%PROFILE%" --virtual-time-budget=20000 --dump-dom "%PAGE%" > "%TEMP%\spatio-test-out.html" 2>nul
powershell -NoProfile -Command "$h = Get-Content -Raw -Encoding UTF8 $env:TEMP\spatio-test-out.html; if ($h -match '(?s)<pre id=\"out\">(.*?)</pre>') { [System.Net.WebUtility]::HtmlDecode($matches[1]) } else { 'No report found - did the page load?'; exit 2 }; if ($h -match '<title>ALL PASS') { exit 0 } else { exit 1 }"
exit /b %ERRORLEVEL%
