#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/frontend" || { echo "Failed to cd to frontend"; exit 1; }

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "Created frontend/.env from .env.example"
  else
    echo "Missing frontend/.env - and .env.example not found."
    exit 1
  fi
fi

if ! command -v node &>/dev/null; then
  echo "Node.js is not on PATH."
  echo "Install Node 18+ from https://nodejs.org/ and reopen this terminal."
  exit 1
fi

if ! command -v npm &>/dev/null; then
  echo "npm is not on PATH."
  echo "Reinstall Node 18+ from https://nodejs.org/ and reopen this terminal."
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "Installing frontend dependencies"
  npm install
fi

echo ""
echo "Starting frontend at http://localhost:3000"
echo "Press Ctrl+C to stop."
echo ""
exec npm run dev
