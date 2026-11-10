@echo off
setlocal EnableExtensions DisableDelayedExpansion

cd /d "%~dp0"
if errorlevel 1 (
    echo [ERROR] Could not open the project directory.
    pause
    exit /b 1
)

title Course Manager Server
set "APP_PORT=3000"
set "APP_URL=http://localhost:%APP_PORT%"

echo ============================================
echo   Course Manager - Development Server
echo ============================================
echo.

where node.exe >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js was not found in PATH.
    echo Install Node.js, reopen this window, and try again.
    goto :startup_failed
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm was not found in PATH.
    echo Reinstall Node.js, reopen this window, and try again.
    goto :startup_failed
)

if not exist "package.json" (
    echo [ERROR] package.json was not found in the project directory.
    goto :startup_failed
)

if not exist "node_modules\" (
    echo [ERROR] Dependencies are not installed.
    echo Run: npm install
    goto :startup_failed
)

if not exist "node_modules\.bin\next.cmd" (
    echo [ERROR] The local Next.js CLI was not found.
    echo Run: npm install
    goto :startup_failed
)

if not exist ".env" (
    echo [ERROR] The .env file was not found.
    echo Create it with DATABASE_URL and JWT_SECRET before starting the app.
    goto :startup_failed
)

findstr /b /r /c:"DATABASE_URL=..*" ".env" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] DATABASE_URL is missing or empty in .env.
    goto :startup_failed
)

findstr /b /r /c:"JWT_SECRET=..*" ".env" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] JWT_SECRET is missing or empty in .env.
    goto :startup_failed
)

findstr /l /c:"file:./dev.db" ".env" >nul 2>&1
if not errorlevel 1 if not exist "prisma\dev.db" (
    echo [ERROR] The configured SQLite database prisma\dev.db was not found.
    echo Restore it or initialize the database before starting the app.
    goto :startup_failed
)

call :get_port_owner
if not defined PORT_PID goto :port_available

echo Port %APP_PORT% is already in use by PID %PORT_PID% ^(%PORT_PROCESS%^).
call :is_course_manager_ready
if errorlevel 1 goto :port_conflict

echo An existing Course Manager server is ready.
echo Opening %APP_URL% ...
start "" "%APP_URL%"
exit /b 0

:port_conflict
echo.
echo [ERROR] Port %APP_PORT% belongs to another or unhealthy process.
echo Close that process manually, then run this launcher again.
echo No process was terminated.
goto :startup_failed

:port_available
echo Environment checks passed.
echo Starting Next.js on %APP_URL% ...
echo Press Ctrl+C to stop the server.
echo ============================================
echo.

rem Poll in the background so npm remains attached to this console.
rem The browser opens only after this specific app responds, or polling stops after 60 seconds.
start "" /b powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$url='%APP_URL%/login'; $openUrl='%APP_URL%'; $marker=-join [char[]](25945,30740,35838,26102,31649,29702,31995,32479); $deadline=(Get-Date).AddSeconds(60); while ((Get-Date) -lt $deadline) { Start-Sleep -Seconds 1; try { $response=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2; if ($response.Content.Contains($marker)) { Start-Process -FilePath $openUrl; exit 0 } } catch {} }; Write-Host ''; Write-Host '[WARNING] The server was not ready within 60 seconds. Check the log above.'"

call npm.cmd run dev -- --port %APP_PORT%
set "SERVER_EXIT=%errorlevel%"

echo.
echo ============================================
if "%SERVER_EXIT%"=="0" (
    echo Server stopped.
) else (
    echo [ERROR] Server exited with code %SERVER_EXIT%.
)
echo ============================================
pause
exit /b %SERVER_EXIT%

:get_port_owner
set "PORT_PID="
set "PORT_PROCESS=Unknown"
for /f "tokens=1,* delims=|" %%A in ('powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$connection=Get-NetTCPConnection -State Listen -LocalPort %APP_PORT% -ErrorAction SilentlyContinue ^| Select-Object -First 1; if ($connection) { $process=Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue; $name=if ($process) { $process.ProcessName } else { 'Unknown' }; Write-Output ('{0}|{1}' -f $connection.OwningProcess,$name) }"') do (
    set "PORT_PID=%%A"
    set "PORT_PROCESS=%%B"
)
if defined PORT_PID exit /b 0

rem Fallback for systems where Get-NetTCPConnection is unavailable or restricted.
for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr /r /c:":%APP_PORT% .*LISTENING"') do set "PORT_PID=%%A"
if not defined PORT_PID goto :probe_port
for /f "delims=" %%A in ('powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$process=Get-Process -Id %PORT_PID% -ErrorAction SilentlyContinue; if ($process) { $process.ProcessName }"') do set "PORT_PROCESS=%%A"
exit /b 0

:probe_port
rem A bind probe still prevents an unsafe start if process inspection is denied.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$listener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Any,%APP_PORT%); try { $listener.Start(); $listener.Stop(); exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 set "PORT_PID=Unknown"
exit /b 0

:is_course_manager_ready
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$marker=-join [char[]](25945,30740,35838,26102,31649,29702,31995,32479); try { $response=Invoke-WebRequest -UseBasicParsing -Uri '%APP_URL%/login' -TimeoutSec 5; if ($response.Content.Contains($marker)) { exit 0 } } catch {}; exit 1" >nul 2>&1
exit /b %errorlevel%

:startup_failed
echo.
pause
exit /b 1
