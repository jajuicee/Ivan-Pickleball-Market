@echo off
echo ============================================
echo   Pickleball POS - Build and Deploy
echo ============================================
echo.

echo [1/3] Building frontend...
cd /d "%~dp0frontend"
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Copying to Spring Boot static resources...
if exist "%~dp0backend\src\main\resources\static" (
    rmdir /s /q "%~dp0backend\src\main\resources\static"
)
xcopy /e /i /q "%~dp0frontend\dist" "%~dp0backend\src\main\resources\static"

echo.
echo [3/3] Done! Now restart your Spring Boot backend.
echo.
echo All devices can connect to:  http://YOUR_IP:8080
echo ============================================
pause
