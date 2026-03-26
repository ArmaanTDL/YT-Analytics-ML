#!/bin/bash
# YT TrendLens — One-command launcher
set -e

echo ""
echo "  ▶  YT TRENDLENS — YouTube Trending Analysis"
echo "  ──────────────────────────────────────────"
echo ""

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "📦 Setting up Python backend..."
cd "$BACKEND_DIR"

if [ ! -d ".venv" ]; then
  echo "  Creating virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate
echo "  Installing Python dependencies..."
pip install -r requirements.txt -q

echo "🚀 Starting FastAPI backend on http://localhost:8000 ..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

echo ""
echo "📦 Setting up Next.js frontend..."
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
  echo "  Installing Node dependencies..."
  npm install
fi

echo "🖥️  Starting Next.js frontend on http://localhost:3000 ..."
npm run dev &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "  ✅ Both servers are running!"
echo "  → Frontend:  http://localhost:3000"
echo "  → Backend:   http://localhost:8000"
echo "  → API Docs:  http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo ""

trap "echo '\nShutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
