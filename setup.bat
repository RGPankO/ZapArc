@echo off
setlocal enabledelayedexpansion

REM Mobile App Skeleton - Complete Setup Script for Windows
REM This script sets up both backend and mobile app for development

echo.
echo 🚀 Mobile App Skeleton - Complete Setup
echo ======================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo [SUCCESS] Node.js is installed: 
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed. Please install npm
    pause
    exit /b 1
)

echo [SUCCESS] npm is installed: 
npm --version

REM Install Expo CLI globally if not present
expo --version >nul 2>&1
if errorlevel 1 (
    echo [INFO] Installing Expo CLI globally...
    npm install -g @expo/cli
    if errorlevel 1 (
        echo [ERROR] Failed to install Expo CLI
        pause
        exit /b 1
    )
    echo [SUCCESS] Expo CLI installed
) else (
    echo [SUCCESS] Expo CLI is already installed
)

echo.
echo [INFO] Setting up backend...

REM Setup backend
cd backend

echo [INFO] Installing backend dependencies...
npm install
if errorlevel 1 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)
echo [SUCCESS] Backend dependencies installed

REM Setup environment file
if not exist .env (
    echo [INFO] Creating .env file from template...
    copy .env.example .env
    echo [WARNING] Please edit backend\.env file with your database credentials and JWT secrets
    echo [WARNING] Default SQLite database will be used if no MySQL connection is configured
) else (
    echo [SUCCESS] .env file already exists
)

REM Setup database
echo [INFO] Setting up database...
npm run db:setup
if errorlevel 1 (
    echo [ERROR] Database setup failed
    pause
    exit /b 1
)
echo [SUCCESS] Database setup completed

cd ..

echo.
echo [INFO] Setting up mobile app...

REM Setup mobile app
cd mobile-app

echo [INFO] Installing mobile app dependencies...
npm install
if errorlevel 1 (
    echo [ERROR] Failed to install mobile app dependencies
    pause
    exit /b 1
)
echo [SUCCESS] Mobile app dependencies installed

echo [INFO] Configuring network settings...

REM Get local IP address (simplified for Windows)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set "ip=%%a"
    set "ip=!ip: =!"
    if not "!ip!"=="127.0.0.1" (
        set "LOCAL_IP=!ip!"
        goto :found_ip
    )
)

:found_ip
if defined LOCAL_IP (
    echo [INFO] Detected local IP: !LOCAL_IP!
    echo [INFO] Updating network configuration...
    
    REM Update the network config file (simplified approach)
    echo [WARNING] Please manually update mobile-app\src\config\network.ts with your IP: !LOCAL_IP!
) else (
    echo [WARNING] Could not detect local IP. Please manually update mobile-app\src\config\network.ts
)

cd ..

echo.
echo [SUCCESS] 🎉 Setup completed successfully!
echo.
echo 📋 Next Steps:
echo ==============
echo.
echo 1. 📝 Configure Backend:
echo    - Edit backend\.env with your database credentials
echo    - For MySQL: Update DATABASE_URL
echo    - For SQLite: Default configuration is ready
echo.
echo 2. 🚀 Start Backend Server:
echo    cd backend
echo    npm run dev
echo.
echo 3. 📱 Start Mobile App (in new terminal):
echo    cd mobile-app
echo    npm start
echo.
echo 4. 🧪 Test the App:
echo    - Use test credentials: test@example.com / testpassword123
echo    - Or register a new account
echo.
echo 5. 🌐 Access Options:
echo    - Web: Press 'w' in Expo CLI
echo    - iOS Simulator: Press 'i' (Mac only)
echo    - Android Emulator: Press 'a'
echo    - Physical Device: Scan QR code with Expo Go app
echo.
echo [SUCCESS] Happy coding! 🚀
echo.
pause