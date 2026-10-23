@echo off
echo ============================================
echo  SalesSpark - Big Data Analytics Dashboard
echo  Starting Backend (FastAPI+PySpark) + Frontend (React)
echo ============================================

:: Auto-detect local JDK if present
if not defined JAVA_HOME (
    if exist "%~dp0..\jdk-17" (
        for /d %%D in ("%~dp0..\jdk-17\*") do (
            if exist "%%D\bin\java.exe" (
                set "JAVA_HOME=%%D"
                set "PATH=%%D\bin;%PATH%"
            )
        )
    )
    if exist "%~dp0jdk-17" (
        for /d %%D in ("%~dp0jdk-17\*") do (
            if exist "%%D\bin\java.exe" (
                set "JAVA_HOME=%%D"
                set "PATH=%%D\bin;%PATH%"
            )
        )
    )
)

:: Check Java
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Java not found! Please install Java 17 from https://adoptium.net
    echo         Set JAVA_HOME after installation.
    pause
    exit /b 1
)

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found! Install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found! Install Node 18+ from https://nodejs.org
    pause
    exit /b 1
)

echo [1/4] Installing Python dependencies...
cd /d "%~dp0backend"
pip install -r requirements.txt -q
if %errorlevel% neq 0 (
    echo [ERROR] pip install failed.
    pause
    exit /b 1
)

echo [2/4] Installing Node.js dependencies...
cd /d "%~dp0frontend"
call npm install --silent
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)

echo [3/4] Starting Backend on port 8000...
cd /d "%~dp0backend"
start "SalesSpark Backend" cmd /c "python main.py"

echo [4/4] Waiting 5s for backend to start, then launching frontend...
timeout /t 5 /nobreak >nul

echo Starting Frontend on port 5173...
cd /d "%~dp0frontend"
start "SalesSpark Frontend" cmd /c "npm run dev"

echo.
echo ============================================
echo  DONE! Open http://localhost:5173 in your browser
echo  Backend API: http://localhost:8000
echo  Spark may take 30-60s to fully initialize.
echo ============================================
pause
