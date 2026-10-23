#!/bin/bash
set -e
echo "============================================"
echo " SalesSpark — Starting Backend + Frontend"
echo "============================================"

# Check Java
if ! command -v java &> /dev/null; then
    echo "[ERROR] Java not found. Install Java 17 from https://adoptium.net"
    exit 1
fi

# Install Python deps
echo "[1/3] Installing Python dependencies..."
cd "$(dirname "$0")/backend"
pip install -r requirements.txt -q

# Install Node deps
echo "[2/3] Installing Node.js dependencies..."
cd "$(dirname "$0")/frontend"
npm install --silent

# Start backend
echo "[3/3] Starting backend on port 8000..."
cd "$(dirname "$0")/backend"
python main.py &
BACKEND_PID=$!

echo "Waiting 5s for Spark to start..."
sleep 5

# Start frontend
echo "Starting frontend on port 5173..."
cd "$(dirname "$0")/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "============================================"
echo " Open: http://localhost:5173"
echo " API:  http://localhost:8000"
echo " Press Ctrl+C to stop both servers"
echo "============================================"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
