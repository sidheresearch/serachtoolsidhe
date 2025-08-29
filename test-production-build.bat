@echo off
echo 🚀 Building and testing frontend with live backend integration...
echo.

cd /d "%~dp0my-next-app"

echo 📦 Installing dependencies...
call npm install

echo 🔨 Building application with production configuration...
set NEXT_PUBLIC_API_URL=http://13.126.160.124:8000
set NODE_ENV=production
call npm run build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Build successful! 
    echo.
    echo 🌐 Starting production server...
    echo    Frontend will be available at: http://localhost:3000
    echo    Using live backend API at: http://13.126.160.124:8000
    echo.
    echo    Press Ctrl+C to stop the server
    echo.
    call npm start
) else (
    echo.
    echo ❌ Build failed! Please check the errors above.
    pause
)
