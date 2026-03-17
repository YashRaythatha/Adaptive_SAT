#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/backend" || { echo "Failed to cd to backend"; exit 1; }

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "Created backend/.env from .env.example"
  else
    echo "Missing backend/.env - and .env.example not found."
    echo "Please create backend/.env and set DATABASE_URL."
    exit 1
  fi
fi

if [[ ! -f .venv/bin/python ]]; then
  echo "Creating backend virtual environment"
  for py in python3.12 python3.11 python3; do
    if command -v "$py" &>/dev/null; then
      "$py" -m venv .venv
      break
    fi
  done
  if [[ ! -f .venv/bin/python ]]; then
    echo "Failed to create venv. Install Python 3.11+ and ensure python3 is in PATH."
    exit 1
  fi
  DO_PIP_INSTALL=1
fi

# shellcheck source=/dev/null
source .venv/bin/activate

if [[ -n "$DO_PIP_INSTALL" ]]; then
  echo "Installing backend dependencies"
  python -m pip install --upgrade pip -q
  pip install -r requirements.txt
fi

HOST="127.0.0.1"
PORT=8000
if lsof -i :8000 -sTCP:LISTEN -t &>/dev/null; then
  PORT=8001
  echo "Port 8000 in use - using 8001"
fi

echo ""
echo "Starting backend at http://${HOST}:${PORT}  - Docs: /docs"
echo "Press Ctrl+C to stop."
echo ""
exec python -m uvicorn app.main:app --host "$HOST" --port "$PORT" --reload
