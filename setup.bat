@echo off
setlocal enabledelayedexpansion

echo 🚀 Setting up Research Agent project...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo [SUCCESS] Node.js detected
echo.

REM Setup environment file
if not exist .env (
    echo [INFO] Creating .env file from template...
    copy .env.example .env >nul
    echo [WARNING] Please edit .env file with your API keys before continuing
    echo Required API keys:
    echo   - GEMINI_API_KEY ^(Google AI Studio^)
    echo   - BRAVE_SEARCH_API_KEY ^(Brave Search API^)
    echo   - Generate JWT_SECRET and ENCRYPTION_KEY using:
    echo     node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
    echo     node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(16).toString('hex'))"
    echo.
) else (
    echo [SUCCESS] .env file already exists
)

REM Install shared dependencies first
echo [INFO] Installing shared dependencies...
cd shared
npm install --legacy-peer-deps
cd ..

REM Install backend dependencies
echo [INFO] Installing backend dependencies...
cd backend

REM Remove existing node_modules and package-lock.json
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

REM Install with legacy peer deps
npm install --legacy-peer-deps --no-audit --no-fund

echo [SUCCESS] Backend dependencies installed
cd ..

REM Install frontend dependencies
echo [INFO] Installing frontend dependencies...
cd frontend

REM Remove existing node_modules and package-lock.json
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

REM Install frontend dependencies
npm install --legacy-peer-deps --no-audit --no-fund

echo [SUCCESS] Frontend dependencies installed
cd ..

REM Generate Prisma client
echo [INFO] Generating Prisma client...
cd backend
npx prisma generate
cd ..

echo [SUCCESS] Setup completed successfully!
echo.
echo [INFO] Next steps:
echo 1. Edit .env file with your API keys
echo 2. Start with Docker: docker-compose up -d
echo 3. Or start locally:
echo    - Backend: cd backend ^&^& npm run dev
echo    - Frontend: cd frontend ^&^& npm run dev
echo.
echo [INFO] Access the application:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:4000
echo - Health Check: http://localhost:4000/api/health

pause
